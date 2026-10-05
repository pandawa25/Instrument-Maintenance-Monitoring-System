import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';

const SORTABLE_FIELDS = [
  'spkNumber',
  'maintenanceDate',
  'failureCategory',
  'priority',
  'status',
  'completionDate',
  'createdAt',
  'updatedAt',
] as const;
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { SparePartsRepository } from '../spare-parts/spare-parts.repository';

interface MaterialRow {
  sparePartId: string;
  quantity: number | string | Decimal;
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
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SORTABLE_FIELDS, 'maintenanceDate'),
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
      orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SORTABLE_FIELDS, 'maintenanceDate'),
      include: LIST_INCLUDE,
    });
  }

  /**
   * ATURAN STOCK (revisi 5 Okt 2026): stock material Corrective Maintenance dipotong HANYA saat
   * status menjadi COMPLETED — bukan saat CM dibuat/diisi. Selama Open/In Progress/Waiting
   * Material/Cancelled, material hanya "daftar kebutuhan" tanpa efek ke stock. Karena COMPLETED
   * terminal (tidak bisa keluar dari status itu), pengembalian stock hanya terjadi kalau:
   *   - material CM yang SUDAH Completed diedit (restore daftar lama + potong daftar baru), atau
   *   - CM yang SUDAH Completed dihapus.
   * Tanggal transaksi movement = tanggal selesai CM.
   *
   * Kurangi stock tiap spare part lewat SparePartsRepository.recordMovement() supaya tercatat di
   * ledger (MAINTENANCE_USAGE) dan atomic dalam `tx` yang sama dengan perubahan CM.
   * recordMovement() menolak (BadRequestException) kalau stock tidak cukup — artinya CM tidak
   * bisa di-Completed sampai stock mencukupi (seluruh transaksi di-rollback).
   *
   * `quantity` TIDAK dibulatkan ke integer sejak `SparePart.stock` Decimal(10,2).
   * Lihat docs/roadmap.md Risk #1.
   */
  private async decrementStock(
    tx: any,
    materials: MaterialRow[],
    maintenanceId: string,
    actorId: string,
    movementDate: Date,
  ) {
    for (const m of materials) {
      const qty = new Decimal(m.quantity);
      if (qty.lessThanOrEqualTo(0)) continue;

      await this.sparePartsRepository.recordMovement(tx, {
        sparePartId: m.sparePartId,
        type: 'MAINTENANCE_USAGE',
        quantityDelta: qty.negated(),
        referenceType: 'CORRECTIVE_MAINTENANCE',
        referenceId: maintenanceId,
        movementDate,
        createdById: actorId,
      });
    }
  }

  /** Kembalikan stock — hanya untuk CM yang sudah Completed (material diedit / CM dihapus). */
  private async restoreStock(
    tx: any,
    materials: MaterialRow[],
    maintenanceId: string,
    actorId: string,
    movementDate: Date,
  ) {
    for (const m of materials) {
      const qty = new Decimal(m.quantity);
      if (qty.lessThanOrEqualTo(0)) continue;

      await this.sparePartsRepository.recordMovement(tx, {
        sparePartId: m.sparePartId,
        type: 'MAINTENANCE_RETURN',
        quantityDelta: qty,
        referenceType: 'CORRECTIVE_MAINTENANCE',
        referenceId: maintenanceId,
        movementDate,
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

      // Stock hanya terpotong kalau CM langsung dibuat dengan status COMPLETED (mis. input data
      // historis); selain itu material cuma daftar kebutuhan sampai nanti di-Completed.
      if (resolvedStatus === 'COMPLETED' && materials?.length) {
        await this.decrementStock(tx, materials, created.id, createdById, created.completionDate ?? new Date());
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
      const updated = await tx.correctiveMaintenance.update({
        where: { id },
        data: {
          ...rest,
          ...(areaId ? { areaId } : {}),
          maintenanceDate: maintenanceDate ? new Date(maintenanceDate) : undefined,
          completionDate: resolvedCompletionDate,
          notificationDate: notificationDate ? new Date(notificationDate) : undefined,
          workOrderDate: workOrderDate ? new Date(workOrderDate) : undefined,
        },
        select: { status: true, completionDate: true },
      });

      const wasCompleted = previousStatus === 'COMPLETED';
      const isCompleted = updated.status === 'COMPLETED';
      const movementDate: Date = updated.completionDate ?? new Date();

      if (materials) {
        const oldMaterials: MaterialRow[] = await tx.correctiveMaintenanceMaterial.findMany({
          where: { correctiveMaintenanceId: id },
        });
        // Stock hanya pernah terpotong kalau CM sebelumnya sudah Completed — kembalikan dulu
        // daftar lama (supaya tidak "double-counted"), baru potong daftar baru di bawah.
        if (wasCompleted) {
          await this.restoreStock(tx, oldMaterials, id, actorId, movementDate);
        }

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
          // Berlaku untuk CM yang baru jadi Completed DAN CM Completed yang materialnya diganti.
          if (isCompleted) {
            await this.decrementStock(tx, materials, id, actorId, movementDate);
          }
        }
      } else if (!wasCompleted && isCompleted) {
        // Baru di-Completed tanpa mengubah daftar material — potong stock sesuai material yang ada.
        const currentMaterials: MaterialRow[] = await tx.correctiveMaintenanceMaterial.findMany({
          where: { correctiveMaintenanceId: id },
        });
        if (currentMaterials.length) {
          await this.decrementStock(tx, currentMaterials, id, actorId, movementDate);
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
      // Stock hanya pernah terpotong untuk CM yang sudah Completed — hanya itu yang perlu
      // dikembalikan saat dihapus. CM berstatus lain tidak pernah menyentuh stock.
      const current = await tx.correctiveMaintenance.findUnique({
        where: { id },
        select: { status: true, completionDate: true },
      });

      if (current?.status === 'COMPLETED') {
        const materials: MaterialRow[] = await tx.correctiveMaintenanceMaterial.findMany({
          where: { correctiveMaintenanceId: id },
        });
        await this.restoreStock(tx, materials, id, actorId, current.completionDate ?? new Date());
      }

      return tx.correctiveMaintenance.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
