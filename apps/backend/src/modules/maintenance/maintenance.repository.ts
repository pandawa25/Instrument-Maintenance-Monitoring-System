import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { SparePartsRepository } from '../spare-parts/spare-parts.repository';

interface MaterialRow {
  sparePartId: string;
  quantity: number | string | Prisma.Decimal;
}

const LIST_INCLUDE = {
  equipment: { select: { id: true, tagNumber: true, service: true } },
  area: { select: { id: true, areaCode: true, areaName: true } },
  technician: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
  materials: {
    include: { sparePart: { select: { id: true, kimap: true, name: true, unit: true } } },
  },
  additionalTechnicians: {
    include: { user: { select: { id: true, fullName: true } } },
  },
} satisfies Prisma.CorrectiveMaintenanceInclude;

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Corrective Maintenance.
 * Mengikuti pola yang sama dengan EquipmentRepository.
 */
@Injectable()
export class MaintenanceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sparePartsRepository: SparePartsRepository,
  ) {}

  private buildWhere(query: QueryMaintenanceDto): Prisma.CorrectiveMaintenanceWhereInput {
    const where: Prisma.CorrectiveMaintenanceWhereInput = { deletedAt: null };

    if (query.areaId) {
      where.areaId = query.areaId;
    }

    if (query.equipmentId) {
      where.equipmentId = query.equipmentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      where.maintenanceDate = {
        gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
        lte: query.dateTo ? new Date(query.dateTo) : undefined,
      };
    }

    if (query.search) {
      where.OR = [
        { problemDescription: { contains: query.search, mode: 'insensitive' } },
        { equipment: { tagNumber: { contains: query.search, mode: 'insensitive' } } },
        { equipment: { service: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  async findMany(query: QueryMaintenanceDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.correctiveMaintenance.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: LIST_INCLUDE,
      }),
      this.prisma.correctiveMaintenance.count({ where }),
    ]);

    return { rows, total };
  }

  findById(id: string) {
    return this.prisma.correctiveMaintenance.findFirst({
      where: { id, deletedAt: null },
      include: LIST_INCLUDE,
    });
  }

  /**
   * Kurangi stock tiap spare part yang dipakai (quantity dibulatkan ke integer
   * terdekat — stock master dalam satuan bulat/pcs), lewat SparePartsRepository
   * .recordMovement() supaya tercatat di ledger (tipe MAINTENANCE_USAGE) dan
   * tetap atomic dalam `tx` yang sama dengan perubahan Corrective Maintenance.
   * recordMovement() sendiri yang menolak (BadRequestException) kalau stock
   * tidak cukup.
   */
  private async decrementStock(tx: any, materials: MaterialRow[], maintenanceId: string, actorId: string) {
    for (const m of materials) {
      const qty = Math.round(Number(m.quantity));
      if (qty <= 0) continue;

      await this.sparePartsRepository.recordMovement(tx, {
        sparePartId: m.sparePartId,
        type: 'MAINTENANCE_USAGE',
        quantityDelta: -qty,
        referenceType: 'CORRECTIVE_MAINTENANCE',
        referenceId: maintenanceId,
        createdById: actorId,
      });
    }
  }

  /** Kembalikan stock — dipakai saat material lama diganti (update) atau maintenance dihapus. */
  private async restoreStock(tx: any, materials: MaterialRow[], maintenanceId: string, actorId: string) {
    for (const m of materials) {
      const qty = Math.round(Number(m.quantity));
      if (qty <= 0) continue;

      await this.sparePartsRepository.recordMovement(tx, {
        sparePartId: m.sparePartId,
        type: 'MAINTENANCE_RETURN',
        quantityDelta: qty,
        referenceType: 'CORRECTIVE_MAINTENANCE',
        referenceId: maintenanceId,
        createdById: actorId,
      });
    }
  }

  create(dto: CreateMaintenanceDto, areaId: string, createdById: string) {
    const {
      maintenanceDate,
      completionDate,
      notificationDate,
      workOrderDate,
      status,
      materials,
      additionalTechnicianIds,
      ...rest
    } = dto;
    const resolvedStatus = status ?? 'OPEN';
    // Kalau status langsung diisi COMPLETED tapi completionDate kosong,
    // default-kan ke hari ini — cukup untuk kelengkapan data tanpa memaksa
    // input tambahan di form (bukan validasi wajib, hanya fallback praktis).
    const resolvedCompletionDate =
      completionDate ? new Date(completionDate) : resolvedStatus === 'COMPLETED' ? new Date() : undefined;

    return this.prisma.$transaction(async (tx: any) => {
      const created = await tx.correctiveMaintenance.create({
        data: {
          ...rest,
          maintenanceDate: new Date(maintenanceDate),
          completionDate: resolvedCompletionDate,
          notificationDate: notificationDate ? new Date(notificationDate) : undefined,
          workOrderDate: workOrderDate ? new Date(workOrderDate) : undefined,
          status: resolvedStatus,
          areaId,
          createdById,
          materials: materials?.length
            ? {
                createMany: {
                  data: materials.map((m) => ({
                    sparePartId: m.sparePartId,
                    quantity: m.quantity,
                    remarks: m.remarks,
                  })),
                },
              }
            : undefined,
          additionalTechnicians: additionalTechnicianIds?.length
            ? { createMany: { data: additionalTechnicianIds.map((userId) => ({ userId })) } }
            : undefined,
        },
      });

      if (materials?.length) {
        await this.decrementStock(tx, materials, created.id, createdById);
      }

      return tx.correctiveMaintenance.findFirst({ where: { id: created.id }, include: LIST_INCLUDE });
    });
  }

  async update(id: string, dto: UpdateMaintenanceDto, actorId: string, areaId?: string) {
    const { maintenanceDate, completionDate, notificationDate, workOrderDate, materials, additionalTechnicianIds, ...rest } =
      dto;
    const resolvedCompletionDate = completionDate
      ? new Date(completionDate)
      : dto.status === 'COMPLETED'
        ? new Date()
        : undefined;

    return this.prisma.$transaction(async (tx: any) => {
      await tx.correctiveMaintenance.update({
        where: { id },
        data: {
          ...rest,
          ...(areaId ? { areaId } : {}),
          maintenanceDate: maintenanceDate ? new Date(maintenanceDate) : undefined,
          completionDate: resolvedCompletionDate,
          notificationDate: notificationDate ? new Date(notificationDate) : undefined,
          workOrderDate: workOrderDate ? new Date(workOrderDate) : undefined,
        },
      });

      if (materials) {
        // Kembalikan dulu stock dari material lama (supaya tidak "double-counted"),
        // baru replace dengan daftar baru & kurangi stock sesuai daftar baru.
        const oldMaterials: MaterialRow[] = await tx.correctiveMaintenanceMaterial.findMany({
          where: { correctiveMaintenanceId: id },
        });
        await this.restoreStock(tx, oldMaterials, id, actorId);

        await tx.correctiveMaintenanceMaterial.deleteMany({ where: { correctiveMaintenanceId: id } });

        if (materials.length) {
          await tx.correctiveMaintenanceMaterial.createMany({
            data: materials.map((m: { sparePartId: string; quantity: number; remarks?: string }) => ({
              correctiveMaintenanceId: id,
              sparePartId: m.sparePartId,
              quantity: m.quantity,
              remarks: m.remarks,
            })),
          });
          await this.decrementStock(tx, materials, id, actorId);
        }
      }

      if (additionalTechnicianIds) {
        // Replace-all — pola sama dengan materials di atas (lebih sederhana,
        // tidak ada efek samping seperti stock yang perlu di-restore dulu).
        await tx.correctiveMaintenanceTechnician.deleteMany({ where: { correctiveMaintenanceId: id } });

        if (additionalTechnicianIds.length) {
          await tx.correctiveMaintenanceTechnician.createMany({
            data: additionalTechnicianIds.map((userId: string) => ({ correctiveMaintenanceId: id, userId })),
          });
        }
      }

      return tx.correctiveMaintenance.findFirst({ where: { id }, include: LIST_INCLUDE });
    });
  }

  softDelete(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx: any) => {
      // Maintenance dibatalkan/dihapus — kebutuhan material ikut batal, jadi stock dikembalikan.
      const materials: MaterialRow[] = await tx.correctiveMaintenanceMaterial.findMany({
        where: { correctiveMaintenanceId: id },
      });
      await this.restoreStock(tx, materials, id, actorId);

      return tx.correctiveMaintenance.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
