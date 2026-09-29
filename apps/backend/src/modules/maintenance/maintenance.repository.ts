import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

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
} satisfies Prisma.CorrectiveMaintenanceInclude;

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Corrective Maintenance.
 * Mengikuti pola yang sama dengan EquipmentRepository.
 */
@Injectable()
export class MaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}

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
   * terdekat — stock master dalam satuan bulat/pcs). Ditolak (BadRequestException)
   * kalau stock tidak cukup, supaya tidak ada stock minus.
   */
  private async decrementStock(tx: any, materials: MaterialRow[]) {
    for (const m of materials) {
      const qty = Math.round(Number(m.quantity));
      if (qty <= 0) continue;

      const sparePart = await tx.sparePart.findUnique({ where: { id: m.sparePartId } });
      if (!sparePart) continue; // sudah divalidasi di service — seharusnya tidak terjadi

      if (sparePart.stock < qty) {
        throw new BadRequestException(
          `Stock spare part '${sparePart.kimap}' tidak cukup (tersedia ${sparePart.stock}, dibutuhkan ${qty})`,
        );
      }

      await tx.sparePart.update({ where: { id: m.sparePartId }, data: { stock: { decrement: qty } } });
    }
  }

  /** Kembalikan stock — dipakai saat material lama diganti (update) atau maintenance dihapus. */
  private async restoreStock(tx: any, materials: MaterialRow[]) {
    for (const m of materials) {
      const qty = Math.round(Number(m.quantity));
      if (qty <= 0) continue;
      await tx.sparePart.update({ where: { id: m.sparePartId }, data: { stock: { increment: qty } } });
    }
  }

  create(dto: CreateMaintenanceDto, areaId: string, createdById: string) {
    const { maintenanceDate, completionDate, status, materials, ...rest } = dto;
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
        },
      });

      if (materials?.length) {
        await this.decrementStock(tx, materials);
      }

      return tx.correctiveMaintenance.findFirst({ where: { id: created.id }, include: LIST_INCLUDE });
    });
  }

  async update(id: string, dto: UpdateMaintenanceDto, areaId?: string) {
    const { maintenanceDate, completionDate, materials, ...rest } = dto;
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
        },
      });

      if (materials) {
        // Kembalikan dulu stock dari material lama (supaya tidak "double-counted"),
        // baru replace dengan daftar baru & kurangi stock sesuai daftar baru.
        const oldMaterials: MaterialRow[] = await tx.correctiveMaintenanceMaterial.findMany({
          where: { correctiveMaintenanceId: id },
        });
        await this.restoreStock(tx, oldMaterials);

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
          await this.decrementStock(tx, materials);
        }
      }

      return tx.correctiveMaintenance.findFirst({ where: { id }, include: LIST_INCLUDE });
    });
  }

  softDelete(id: string) {
    return this.prisma.$transaction(async (tx: any) => {
      // Maintenance dibatalkan/dihapus — kebutuhan material ikut batal, jadi stock dikembalikan.
      const materials: MaterialRow[] = await tx.correctiveMaintenanceMaterial.findMany({
        where: { correctiveMaintenanceId: id },
      });
      await this.restoreStock(tx, materials);

      return tx.correctiveMaintenance.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
