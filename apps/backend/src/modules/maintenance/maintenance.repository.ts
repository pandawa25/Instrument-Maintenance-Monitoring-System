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

/** Persen perubahan bulan ini vs bulan lalu, dibulatkan. 0 lama & 0 baru = 0%, bukan NaN. */
function calcTrendPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
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

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.dateFrom || query.dateTo) {
      where.maintenanceDate = {
        gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
        lte: query.dateTo ? new Date(query.dateTo) : undefined,
      };
    }

    if (query.search) {
      where.OR = [
        { spkNumber: { contains: query.search, mode: 'insensitive' } },
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

  /** Dipakai fitur Export — semua baris yang cocok filter, TANPA pagination (skip/take). */
  findAllForExport(query: QueryMaintenanceDto) {
    const where = this.buildWhere(query);
    return this.prisma.correctiveMaintenance.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
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
      // spkNumber diisi manual oleh user (dari aplikasi e-SPK eksternal) — sudah ikut
      // ter-spread via ...rest (field wajib di CreateMaintenanceDto), tidak perlu
      // di-generate di sini.
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

  async update(id: string, dto: UpdateMaintenanceDto, actorId: string, previousStatus: string, areaId?: string) {
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

      // Status berubah jadi CANCELLED (dan belum pernah di-cancel sebelumnya) — kebutuhan
      // material ikut batal, stock dikembalikan. Hanya jalan kalau `materials` TIDAK ikut
      // dikirim di request yang sama (kalau ikut dikirim, sudah ditangani oleh blok
      // restore+replace materials di atas — menghindari double-restore).
      if (!materials && dto.status === 'CANCELLED' && previousStatus !== 'CANCELLED') {
        const currentMaterials: MaterialRow[] = await tx.correctiveMaintenanceMaterial.findMany({
          where: { correctiveMaintenanceId: id },
        });
        if (currentMaterials.length) {
          await this.restoreStock(tx, currentMaterials, id, actorId);
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

  /**
   * Status-per-tab untuk filter bar (Semua/Open/In Progress/Waiting Material/Completed/
   * Cancelled) — menghormati filter search/area/date range yang sedang aktif di halaman
   * list (TAPI bukan filter status itu sendiri, supaya tiap tab tahu count-nya masing2).
   */
  async getStatusCounts(query: QueryMaintenanceDto) {
    const where = this.buildWhere(query);
    // Count per-status ini SENDIRI yang memecah berdasarkan status — filter status dari
    // query (kalau ada) tidak relevan di sini, jadi dibuang dari where-nya.
    delete where.status;

    const [total, grouped] = await this.prisma.$transaction([
      this.prisma.correctiveMaintenance.count({ where }),
      this.prisma.correctiveMaintenance.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        // Prisma mewajibkan `orderBy` secara tipe saat pakai `groupBy` + `by` — nilai
        // urutannya tidak penting di sini karena hasilnya di-map ke object `counts`
        // berdasarkan nama status, bukan berdasarkan urutan array.
        orderBy: { status: 'asc' },
      }),
    ]);

    const counts: Record<string, number> = {
      ALL: total,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_MATERIAL: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const g of grouped as { status: string; _count: { _all: number } }[]) {
      counts[g.status] = g._count._all;
    }
    return counts;
  }

  /**
   * KPI 4 summary card paling atas (Open/Completed/Waiting Material/Total) — SELALU global
   * & berbasis "bulan berjalan", tidak terpengaruh filter tabel di bawahnya (konsisten
   * dengan pola summary card di module Dashboard utama).
   *
   * Asumsi desain (bisa disesuaikan kalau beda dengan kebutuhan lapangan):
   * - "Overdue" = status OPEN/IN_PROGRESS/WAITING_MATERIAL yang maintenance_date-nya sudah
   *   melewati SLA menurut priority: HIGH 1 hari, MEDIUM 3 hari, LOW 7 hari.
   * - "Waiting Material > 7 hari" = status WAITING_MATERIAL yang sudah >= 7 hari sejak
   *   maintenance_date (ambang tetap 7 hari, terpisah dari SLA overdue priority di atas).
   * - "Completed (This Month)" dihitung dari completion_date (bukan maintenance_date),
   *   karena ini soal kapan pekerjaan SELESAI.
   * - "Total (This Month)" dihitung dari maintenance_date (semua record bulan ini, apapun
   *   statusnya) — konsisten dengan arti "pekerjaan yang masuk bulan ini".
   */
  async getKpiSummary() {
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      openCount,
      waitingMaterialCount,
      completedThisMonth,
      completedLastMonth,
      totalThisMonth,
      totalLastMonth,
      overdueRows,
      waitingStuckRows,
    ] = await this.prisma.$transaction([
      this.prisma.correctiveMaintenance.count({ where: { deletedAt: null, status: 'OPEN' } }),
      this.prisma.correctiveMaintenance.count({ where: { deletedAt: null, status: 'WAITING_MATERIAL' } }),
      this.prisma.correctiveMaintenance.count({
        where: { deletedAt: null, status: 'COMPLETED', completionDate: { gte: startThisMonth, lt: startNextMonth } },
      }),
      this.prisma.correctiveMaintenance.count({
        where: { deletedAt: null, status: 'COMPLETED', completionDate: { gte: startLastMonth, lt: startThisMonth } },
      }),
      this.prisma.correctiveMaintenance.count({
        where: { deletedAt: null, maintenanceDate: { gte: startThisMonth, lt: startNextMonth } },
      }),
      this.prisma.correctiveMaintenance.count({
        where: { deletedAt: null, maintenanceDate: { gte: startLastMonth, lt: startThisMonth } },
      }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "corrective_maintenance"
        WHERE "deleted_at" IS NULL
          AND "status" IN ('OPEN', 'IN_PROGRESS', 'WAITING_MATERIAL')
          AND "maintenance_date" <= (CURRENT_DATE - (
            CASE "priority" WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 3 ELSE 7 END
          ) * INTERVAL '1 day')
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "corrective_maintenance"
        WHERE "deleted_at" IS NULL
          AND "status" = 'WAITING_MATERIAL'
          AND "maintenance_date" <= (CURRENT_DATE - 7 * INTERVAL '1 day')
      `,
    ]);

    return {
      openCount,
      overdueCount: Number(overdueRows[0]?.count ?? 0),
      waitingMaterialCount,
      waitingMaterialStuckCount: Number(waitingStuckRows[0]?.count ?? 0),
      completedThisMonth,
      completedTrendPct: calcTrendPct(completedThisMonth, completedLastMonth),
      totalThisMonth,
      totalTrendPct: calcTrendPct(totalThisMonth, totalLastMonth),
    };
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
