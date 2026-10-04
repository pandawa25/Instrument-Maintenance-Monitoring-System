import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Criticality, EquipmentStatus, FailAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentBulkOperationRepository } from './equipment-bulk-operation.repository';
import {
  BulkOperationListItemDto,
  RevertCommitResultDto,
  RevertPreviewResultDto,
  RevertRowDto,
} from './dto/revert-result.dto';

// Toleransi kecil untuk perbandingan timestamp (hindari false-positive "berubah lagi" akibat
// pembulatan milidetik antara waktu snapshot dibuat vs equipment.updatedAt dalam transaksi yang sama).
const CONFLICT_TOLERANCE_MS = 1000;

/**
 * Rollback ("Undo") satu EquipmentBulkOperation — mengembalikan setiap equipment yang
 * terdampak ke nilai SEBELUM operasi itu dijalankan, memakai EquipmentChangeSnapshot.
 *
 * Pagar keamanan utama: equipment yang SUDAH DIUBAH LAGI setelah operasi ini commit (updatedAt
 * lebih baru dari operation.createdAt) TIDAK ikut direstore — supaya rollback tidak diam-diam
 * menimpa perubahan lain yang terjadi di antaranya. Baris begini dilaporkan terpisah sebagai
 * "conflicted", bukan membatalkan seluruh rollback.
 *
 * Endpoint commit-nya dikunci @Roles('Admin') di controller (bukan sekadar permission EQUIPMENT
 * edit biasa) — operasi ini bisa mempengaruhi banyak record sekaligus & tidak ada "undo of undo".
 */
@Injectable()
export class EquipmentRevertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationRepository: EquipmentBulkOperationRepository,
  ) {}

  async listOperations(limit?: number): Promise<BulkOperationListItemDto[]> {
    const ops = await this.operationRepository.findMany(limit);
    return ops.map((op: (typeof ops)[number]) => ({
      id: op.id,
      source: op.source,
      status: op.status,
      affectedCount: op.affectedCount,
      createdBy: op.createdBy,
      createdAt: op.createdAt,
      revertedAt: op.revertedAt,
      revertedBy: op.revertedBy,
      importBatch: op.importBatch,
    }));
  }

  async previewRevert(operationId: string): Promise<RevertPreviewResultDto> {
    const operation = await this.getRevertableOperation(operationId);
    const snapshots = await this.operationRepository.findSnapshots(operationId);

    const equipmentIds = snapshots.map((s: { equipmentId: string }) => s.equipmentId);
    const currentEquipment = await this.prisma.equipment.findMany({ where: { id: { in: equipmentIds } } });
    const currentById = new Map(currentEquipment.map((e) => [e.id, e]));

    const restorable: RevertRowDto[] = [];
    const conflicted: RevertRowDto[] = [];

    for (const snap of snapshots) {
      const before = snap.beforeData as unknown as { tagNumber?: string };
      const tagNumber = before.tagNumber ?? '(tidak diketahui)';
      const current = currentById.get(snap.equipmentId);

      if (!current || current.deletedAt) {
        conflicted.push({ equipmentId: snap.equipmentId, tagNumber, reason: 'Equipment sudah dihapus setelah operasi ini' });
        continue;
      }

      if (this.changedSinceOperation(current.updatedAt, operation.createdAt)) {
        conflicted.push({
          equipmentId: snap.equipmentId,
          tagNumber,
          reason: `Equipment sudah diubah lagi pada ${current.updatedAt.toISOString()} setelah operasi ini — dilewati supaya rollback tidak menimpa perubahan tersebut`,
        });
        continue;
      }

      restorable.push({ equipmentId: snap.equipmentId, tagNumber });
    }

    return {
      operationId,
      totalSnapshots: snapshots.length,
      restorableCount: restorable.length,
      conflictedCount: conflicted.length,
      restorable,
      conflicted,
    };
  }

  async commitRevert(operationId: string, userId: string): Promise<RevertCommitResultDto> {
    const operation = await this.getRevertableOperation(operationId);
    const snapshots = await this.operationRepository.findSnapshots(operationId);
    if (snapshots.length === 0) {
      throw new BadRequestException('Tidak ada data snapshot untuk di-restore pada operasi ini');
    }

    let restoredCount = 0;
    let skippedCount = 0;

    await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        for (const snap of snapshots) {
          const current = await tx.equipment.findUnique({ where: { id: snap.equipmentId } });
          if (!current || current.deletedAt || this.changedSinceOperation(current.updatedAt, operation.createdAt)) {
            skippedCount += 1;
            continue;
          }

          const before = snap.beforeData as unknown as Record<string, unknown>;
          await tx.equipment.update({
            where: { id: snap.equipmentId },
            data: {
              tagNumber: before.tagNumber as string,
              service: before.service as string,
              description: (before.description as string | null) ?? null,
              areaId: before.areaId as string,
              instrumentNameId: before.instrumentNameId as string,
              type: (before.type as string | null) ?? null,
              manufacturer: (before.manufacturer as string | null) ?? null,
              model: (before.model as string | null) ?? null,
              serialNumber: (before.serialNumber as string | null) ?? null,
              installationDate: before.installationDate ? new Date(before.installationDate as string) : null,
              lrv: (before.lrv as string | number | null) ?? null,
              urv: (before.urv as string | number | null) ?? null,
              unit: (before.unit as string | null) ?? null,
              size: (before.size as string | null) ?? null,
              rating: (before.rating as string | null) ?? null,
              failAction: (before.failAction as FailAction | null) ?? null,
              status: before.status as EquipmentStatus,
              criticality: before.criticality as Criticality,
              remarks: (before.remarks as string | null) ?? null,
            },
          });
          restoredCount += 1;
        }

        await tx.equipmentBulkOperation.update({
          where: { id: operationId },
          data: { status: 'REVERTED', revertedAt: new Date(), revertedById: userId },
        });
      },
      { timeout: 30_000 },
    );

    return { operationId, restoredCount, skippedCount };
  }

  private async getRevertableOperation(operationId: string) {
    const operation = await this.operationRepository.findById(operationId);
    if (!operation) {
      throw new NotFoundException('Operasi bulk tidak ditemukan');
    }
    if (operation.status === 'REVERTED') {
      throw new ConflictException('Operasi ini sudah pernah di-rollback sebelumnya — tidak ada "undo of undo"');
    }
    return operation;
  }

  private changedSinceOperation(updatedAt: Date, operationCreatedAt: Date): boolean {
    return updatedAt.getTime() > operationCreatedAt.getTime() + CONFLICT_TOLERANCE_MS;
  }
}
