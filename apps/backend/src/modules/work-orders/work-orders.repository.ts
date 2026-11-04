import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';
import { QueryWorkOrderDto } from './dto/query-work-order.dto';

const SORTABLE_FIELDS = [
  'orderNo',
  'basicStartDate',
  'basicFinDate',
  'orderType',
  'lifecycleStage',
  'createdAt',
] as const;

// Select ringkas sesuai 10 field final yang disepakati di UI (lihat
// docs/design-notification-work-order.md §3/§9) + field minimal untuk fungsi
// (id, equipmentId untuk link, lifecycleStage untuk stepper & filter klik).
const LIST_SELECT = {
  id: true,
  orderNo: true,
  description: true,
  orderType: true,
  basicStartDate: true,
  basicFinDate: true,
  userStatus: true,
  systemStatus: true,
  lifecycleStage: true,
  functionalLocation: true,
  equipmentId: true,
  equipmentTagRaw: true,
  equipmentLinkSource: true,
  notification: { select: { id: true, notificationNo: true } },
  equipment: {
    select: { id: true, tagNumber: true, service: true, area: { select: { id: true, areaCode: true, areaName: true } } },
  },
} satisfies Prisma.WorkOrderSelect;

/** Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Work Order & Notification. */
@Injectable()
export class WorkOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryWorkOrderDto): Prisma.WorkOrderWhereInput {
    const where: Prisma.WorkOrderWhereInput = { deletedAt: null };

    if (query.equipmentId) {
      where.equipmentId = query.equipmentId;
    }

    if (query.areaId) {
      where.equipment = { areaId: query.areaId };
    }

    if (query.orderType) {
      where.orderType = query.orderType;
    }

    if (query.lifecycleStage) {
      where.lifecycleStage = query.lifecycleStage;
    }

    if (query.unmatchedOnly) {
      where.equipmentId = null;
    }

    if (query.dateFrom || query.dateTo) {
      where.basicStartDate = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    if (query.search) {
      where.OR = [
        { orderNo: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { notification: { notificationNo: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  async findMany(query: QueryWorkOrderDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SORTABLE_FIELDS, 'basicStartDate'),
        select: LIST_SELECT,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { rows, total };
  }

  findById(id: string) {
    return this.prisma.workOrder.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...LIST_SELECT,
        // Field tambahan hanya untuk detail (di luar 10 kolom list) — masih disembunyikan di UI
        // Phase 1, tapi tersedia lewat endpoint detail untuk kebutuhan lanjutan tanpa migrasi.
        maintActivType: true,
        superiorOrderId: true,
        correctiveMaintenance: { select: { id: true, spkNumber: true, maintenanceDate: true }, where: { deletedAt: null } },
      },
    });
  }

  /**
   * Jumlah per tahap siklus (CREATED/RELEASED/TECHNICALLY_COMPLETED/CLOSED) — dasar ringkasan
   * stepper di atas list. Menghormati filter lain yang sedang aktif (TAPI bukan filter
   * lifecycleStage itu sendiri), sama pola dengan EquipmentRepository.getStatusCounts().
   */
  async getStageCounts(query: QueryWorkOrderDto) {
    // `skip` adalah getter — sama catatannya seperti di WorkOrdersController.findUnmatched().
    const where = this.buildWhere({ ...query, lifecycleStage: undefined, skip: query.skip });
    const grouped = await this.prisma.workOrder.groupBy({
      by: ['lifecycleStage'],
      where,
      _count: { _all: true },
    });

    const counts: Record<string, number> = { CREATED: 0, RELEASED: 0, TECHNICALLY_COMPLETED: 0, CLOSED: 0 };
    for (const g of grouped as { lifecycleStage: string; _count: { _all: number } }[]) {
      counts[g.lifecycleStage] = g._count._all;
    }
    return counts;
  }

  // equipmentTagRaw SENGAJA tidak disentuh (tidak di-null-kan) saat relink manual — tetap jadi
  // jejak audit nilai mentah asli dari ERP, terlepas dari equipmentId sudah dikoreksi manual atau belum.
  // equipmentLinkSource selalu diset 'MANUAL' di sini (baik menghubungkan MAUPUN sengaja melepas
  // ke null) — supaya commit import berikutnya tidak menimpa keputusan manual ini lagi
  // (lihat WORK_ORDER_UPSERT_SQL di work-order-bulk-sql.ts).
  relinkEquipment(id: string, equipmentId: string | null) {
    return this.prisma.workOrder.update({
      where: { id },
      data: { equipmentId, equipmentLinkSource: 'MANUAL' },
      select: LIST_SELECT,
    });
  }

  /** Cari WorkOrder AKTIF milik equipment tertentu untuk dropdown di form Corrective Maintenance. */
  findDropdownByEquipment(equipmentId: string) {
    return this.prisma.workOrder.findMany({
      where: { equipmentId, deletedAt: null },
      orderBy: { basicStartDate: 'desc' },
      select: { id: true, orderNo: true, notification: { select: { notificationNo: true } }, description: true },
      take: 50,
    });
  }

  findByIdSimple(id: string) {
    return this.prisma.workOrder.findFirst({ where: { id, deletedAt: null } });
  }

  /**
   * Daftar nilai distinct `orderType` (non-null) untuk dropdown filter — diurutkan A-Z.
   * Pola sama dengan EquipmentRepository.getDistinctManufacturers(). orderType adalah kode
   * mentah dari SAP (mis. PT02/PT03 — lihat docs/design-notification-work-order.md §2), bukan
   * master data tersendiri, jadi diambil langsung dari data yang sudah ter-import.
   */
  async getDistinctOrderTypes(): Promise<string[]> {
    const rows = await this.prisma.workOrder.findMany({
      where: { deletedAt: null, orderType: { not: null } },
      distinct: ['orderType'],
      select: { orderType: true },
      orderBy: { orderType: 'asc' },
    });
    return rows.map((r: { orderType: string | null }) => r.orderType as string);
  }
}
