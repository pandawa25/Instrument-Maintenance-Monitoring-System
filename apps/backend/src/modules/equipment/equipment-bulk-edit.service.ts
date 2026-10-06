import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Equipment, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentRepository } from './equipment.repository';
import { InstrumentNamesService } from '../instrument-names/instrument-names.service';
import { BulkEditEquipmentDto, BulkEditFieldsDto } from './dto/bulk-edit-equipment.dto';
import { BulkEditCommitResultDto, BulkEditFieldChangeDto, BulkEditPreviewResultDto } from './dto/bulk-edit-result.dto';

const FIELD_LABELS: Record<string, string> = {
  service: 'Service',
  description: 'Description',
  instrumentNameId: 'Instrument Name',
  type: 'Type',
  manufacturer: 'Manufacturer',
  model: 'Model',
  installationDate: 'Installation Date',
  lrv: 'LRV',
  urv: 'URV',
  unit: 'Unit',
  size: 'Size',
  rating: 'Rating',
  failAction: 'Fail Action',
  status: 'Status',
  criticality: 'Criticality',
  remarks: 'Remarks',
};

/**
 * Fitur "Edit Massal" — ubah satu/beberapa field yang SAMA untuk banyak equipment sekaligus
 * (mis. set Status = OUT_OF_SERVICE untuk 20 equipment terpilih). Field yang boleh diubah
 * SENGAJA tidak termasuk tagNumber/areaId/serialNumber (lihat BulkEditFieldsDto).
 *
 * Alur sama dengan Bulk Upload: preview dulu (lihat before→after per equipment, tanpa
 * menyimpan apa pun), baru commit. Commit men-snapshot nilai SEBELUM diubah ke
 * EquipmentChangeSnapshot (dikelompokkan dalam satu EquipmentBulkOperation
 * source=MANUAL_BULK_EDIT) supaya bisa di-rollback — lihat EquipmentRevertService.
 */
@Injectable()
export class EquipmentBulkEditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: EquipmentRepository,
    private readonly instrumentNamesService: InstrumentNamesService,
  ) {}

  async preview(dto: BulkEditEquipmentDto): Promise<BulkEditPreviewResultDto> {
    this.assertHasAtLeastOneField(dto.data);
    await this.validateReferences(dto.data);

    const equipment = await this.loadAndValidateIds(dto.ids);
    const rows = equipment.map((eq) => {
      const changes = this.diffOne(eq, dto.data);
      return { equipmentId: eq.id, tagNumber: eq.tagNumber, changes };
    });
    const changedRows = rows.filter((r) => r.changes.length > 0);

    return {
      totalSelected: equipment.length,
      changedCount: changedRows.length,
      unchangedCount: equipment.length - changedRows.length,
      rows,
    };
  }

  async commit(dto: BulkEditEquipmentDto, userId: string): Promise<BulkEditCommitResultDto> {
    this.assertHasAtLeastOneField(dto.data);
    await this.validateReferences(dto.data);

    const equipment = await this.loadAndValidateIds(dto.ids);
    const toUpdate = equipment.filter((eq) => this.diffOne(eq, dto.data).length > 0);
    if (toUpdate.length === 0) {
      throw new BadRequestException(
        'Tidak ada perubahan untuk diterapkan — semua equipment terpilih sudah punya nilai yang sama persis.',
      );
    }

    const updateData = this.buildUpdateData(dto.data);
    const operationId = randomUUID();

    await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const snapshots = toUpdate.map((eq) => ({
          id: randomUUID(),
          operationId,
          equipmentId: eq.id,
          // JSON round-trip supaya Decimal/Date konsisten jadi string plain JSON-safe,
          // sama seperti di EquipmentBulkUploadService.commitBatch().
          beforeData: JSON.parse(JSON.stringify(eq)) as Prisma.InputJsonValue,
        }));

        // Nilai yang diterapkan SAMA untuk semua baris → 1 statement updateMany (bukan N update
        // berurutan yang bisa menembus batas waktu transaksi untuk ratusan equipment).
        await tx.equipment.updateMany({ where: { id: { in: toUpdate.map((eq) => eq.id) } }, data: updateData });

        await tx.equipmentBulkOperation.create({
          data: {
            id: operationId,
            source: 'MANUAL_BULK_EDIT',
            affectedCount: toUpdate.length,
            createdById: userId,
          },
        });
        await tx.equipmentChangeSnapshot.createMany({ data: snapshots });
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    return { operationId, updatedCount: toUpdate.length };
  }

  private async loadAndValidateIds(ids: string[]): Promise<Equipment[]> {
    const equipment = await this.repository.findManyByIds(ids);
    if (equipment.length !== ids.length) {
      const foundIds = new Set(equipment.map((e) => e.id));
      const missingCount = ids.filter((id) => !foundIds.has(id)).length;
      throw new BadRequestException(
        `${missingCount} equipment dari daftar yang dipilih sudah tidak ada/terhapus — refresh daftar lalu pilih ulang.`,
      );
    }
    return equipment;
  }

  private assertHasAtLeastOneField(data: BulkEditFieldsDto) {
    const hasAny = Object.values(data).some((v) => v !== undefined);
    if (!hasAny) {
      throw new BadRequestException('Pilih minimal satu field yang ingin diubah');
    }
  }

  private async validateReferences(data: BulkEditFieldsDto) {
    if (data.instrumentNameId) {
      try {
        await this.instrumentNamesService.findOne(data.instrumentNameId);
      } catch {
        throw new BadRequestException(`Instrument name dengan id '${data.instrumentNameId}' tidak ditemukan`);
      }
    }
  }

  private buildUpdateData(data: BulkEditFieldsDto): Prisma.EquipmentUncheckedUpdateManyInput {
    const update: Prisma.EquipmentUncheckedUpdateManyInput = {};
    if (data.service !== undefined) update.service = data.service;
    if (data.description !== undefined) update.description = data.description ?? null;
    if (data.instrumentNameId !== undefined) update.instrumentNameId = data.instrumentNameId;
    if (data.type !== undefined) update.type = data.type ?? null;
    if (data.manufacturer !== undefined) update.manufacturer = data.manufacturer ?? null;
    if (data.model !== undefined) update.model = data.model ?? null;
    if (data.installationDate !== undefined) {
      update.installationDate = data.installationDate ? new Date(data.installationDate) : null;
    }
    if (data.lrv !== undefined) update.lrv = data.lrv ?? null;
    if (data.urv !== undefined) update.urv = data.urv ?? null;
    if (data.unit !== undefined) update.unit = data.unit ?? null;
    if (data.size !== undefined) update.size = data.size ?? null;
    if (data.rating !== undefined) update.rating = data.rating ?? null;
    if (data.failAction !== undefined) update.failAction = data.failAction ?? null;
    if (data.status !== undefined) update.status = data.status;
    if (data.criticality !== undefined) update.criticality = data.criticality;
    if (data.remarks !== undefined) update.remarks = data.remarks ?? null;
    return update;
  }

  /** Hanya field yang dikirim (!== undefined) yang dibandingkan — konsisten dengan buildUpdateData(). */
  private diffOne(eq: Equipment, data: BulkEditFieldsDto): BulkEditFieldChangeDto[] {
    const changes: BulkEditFieldChangeDto[] = [];
    const push = (field: string, before: unknown, after: unknown) => {
      if (before !== after) changes.push({ field, label: FIELD_LABELS[field] ?? field, before, after });
    };

    if (data.service !== undefined) push('service', eq.service, data.service);
    if (data.description !== undefined) push('description', eq.description, data.description ?? null);
    if (data.instrumentNameId !== undefined) push('instrumentNameId', eq.instrumentNameId, data.instrumentNameId);
    if (data.type !== undefined) push('type', eq.type, data.type ?? null);
    if (data.manufacturer !== undefined) push('manufacturer', eq.manufacturer, data.manufacturer ?? null);
    if (data.model !== undefined) push('model', eq.model, data.model ?? null);
    if (data.installationDate !== undefined) {
      const before = eq.installationDate ? eq.installationDate.toISOString().slice(0, 10) : null;
      push('installationDate', before, data.installationDate ?? null);
    }
    if (data.lrv !== undefined) push('lrv', eq.lrv !== null ? Number(eq.lrv) : null, data.lrv ?? null);
    if (data.urv !== undefined) push('urv', eq.urv !== null ? Number(eq.urv) : null, data.urv ?? null);
    if (data.unit !== undefined) push('unit', eq.unit, data.unit ?? null);
    if (data.size !== undefined) push('size', eq.size, data.size ?? null);
    if (data.rating !== undefined) push('rating', eq.rating, data.rating ?? null);
    if (data.failAction !== undefined) push('failAction', eq.failAction, data.failAction ?? null);
    if (data.status !== undefined) push('status', eq.status, data.status);
    if (data.criticality !== undefined) push('criticality', eq.criticality, data.criticality);
    if (data.remarks !== undefined) push('remarks', eq.remarks, data.remarks ?? null);

    return changes;
  }
}
