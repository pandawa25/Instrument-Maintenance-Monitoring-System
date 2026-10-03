import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';
import { QueryAllStockMovementsDto } from './dto/query-all-stock-movements.dto';

const SPARE_PART_SORTABLE_FIELDS = ['kimap', 'name', 'stock', 'status', 'createdAt', 'updatedAt'] as const;
const STOCK_MOVEMENT_SORTABLE_FIELDS = ['type', 'quantityDelta', 'balanceAfter', 'createdAt'] as const;

interface RecordMovementParams {
  sparePartId: string;
  type: StockMovementType;
  // number | string | Decimal (bukan cuma number) — pemanggil di
  // MaintenanceRepository mengirim Decimal langsung (lihat decrementStock/
  // restoreStock), bukan number biasa, sejak migrasi stock ke Decimal.
  quantityDelta: number | string | Decimal;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdById: string;
}

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Spare Part / Material.
 * Mengikuti pola yang sama dengan VendorsRepository.
 */
@Injectable()
export class SparePartsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QuerySparePartDto): Prisma.SparePartWhereInput {
    const where: Prisma.SparePartWhereInput = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { kimap: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: QuerySparePartDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sparePart.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SPARE_PART_SORTABLE_FIELDS, 'createdAt'),
      }),
      this.prisma.sparePart.count({ where }),
    ]);

    return { rows, total };
  }

  // Dropdown ringan tanpa pagination — dibangun sejak awal (bukan tambahan
  // belakangan) untuk menghindari bug limit pagination yang sudah pernah terjadi
  // di modul Equipment/PM Program.
  findAllForDropdown() {
    return this.prisma.sparePart.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { kimap: 'asc' },
      select: { id: true, kimap: true, name: true, unit: true, stock: true },
    });
  }

  findById(id: string) {
    return this.prisma.sparePart.findFirst({ where: { id, deletedAt: null } });
  }

  findByKimap(kimap: string) {
    return this.prisma.sparePart.findFirst({ where: { kimap, deletedAt: null } });
  }

  /**
   * Spare part baru selalu dibuat dengan stock 0, lalu (kalau `dto.stock` > 0)
   * langsung dicatat sebagai 1 baris ledger ADJUSTMENT ("saldo awal") dalam
   * transaction yang sama. Ini memastikan SparePart.stock TIDAK PERNAH berubah
   * di luar recordMovement() — termasuk saat pertama kali dibuat.
   */
  createWithInitialStock(dto: CreateSparePartDto, createdById: string) {
    const { stock: initialStock, ...rest } = dto;

    return this.prisma.$transaction(async (tx: any) => {
      const created = await tx.sparePart.create({ data: { ...rest, stock: 0 } });

      if (initialStock && initialStock > 0) {
        await this.recordMovement(tx, {
          sparePartId: created.id,
          type: 'ADJUSTMENT',
          quantityDelta: initialStock,
          referenceType: 'INITIAL_BALANCE',
          notes: 'Saldo awal saat spare part dibuat',
          createdById,
        });
      }

      return tx.sparePart.findUnique({ where: { id: created.id } });
    });
  }

  update(id: string, dto: UpdateSparePartDto) {
    return this.prisma.sparePart.update({ where: { id }, data: dto });
  }

  softDelete(id: string) {
    return this.prisma.sparePart.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countUsage(sparePartId: string) {
    return this.prisma.correctiveMaintenanceMaterial.count({ where: { sparePartId } });
  }

  /**
   * Satu-satunya cara sah mengubah `SparePart.stock` — menulis stock baru +
   * baris ledger dalam 1 operasi atomic. `tx` boleh berupa PrismaService
   * (dibungkus transaction sendiri) ATAU transaction client dari modul lain
   * (mis. MaintenanceRepository saat create/update/delete Corrective
   * Maintenance) supaya perubahan stock ikut atomic dengan perubahan itu.
   *
   * Tidak ada row-level locking (SELECT ... FOR UPDATE) — risiko race condition
   * diterima sadar untuk MVP (tim kecil, kemungkinan sangat rendah).
   */
  async recordMovement(tx: any, params: RecordMovementParams): Promise<Decimal> {
    const sparePart = await tx.sparePart.findUnique({ where: { id: params.sparePartId } });
    if (!sparePart) {
      throw new BadRequestException(`Spare part dengan id '${params.sparePartId}' tidak ditemukan`);
    }

    // `sparePart.stock` datang dari Prisma sebagai instance Decimal (decimal.js) —
    // operator aritmetika native (`+`, `<`) TIDAK bekerja benar untuknya (sejak
    // migrasi stock dari Int ke Decimal, lihat docs/roadmap.md Risk #1), wajib
    // pakai method Decimal. `decimal.js` diimpor langsung (bukan `Prisma.Decimal`)
    // supaya tidak bergantung pada generated client untuk sekadar konstruksi nilai.
    const delta = new Decimal(params.quantityDelta);
    const balanceAfter = sparePart.stock.plus(delta);
    if (balanceAfter.isNegative()) {
      throw new BadRequestException(
        `Stock spare part '${sparePart.kimap}' tidak cukup (tersedia ${sparePart.stock}, dibutuhkan ${delta.negated()})`,
      );
    }

    await tx.sparePart.update({ where: { id: params.sparePartId }, data: { stock: balanceAfter } });
    await tx.sparePartStockMovement.create({
      data: {
        sparePartId: params.sparePartId,
        type: params.type,
        quantityDelta: delta,
        balanceAfter,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        notes: params.notes,
        createdById: params.createdById,
      },
    });

    return balanceAfter;
  }

  createManualMovement(params: RecordMovementParams) {
    return this.prisma.$transaction(async (tx: any) => this.recordMovement(tx, params));
  }

  async findMovements(sparePartId: string, query: QueryStockMovementDto) {
    const where: Prisma.SparePartStockMovementWhereInput = { sparePartId };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sparePartStockMovement.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, STOCK_MOVEMENT_SORTABLE_FIELDS, 'createdAt'),
        include: { createdBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.sparePartStockMovement.count({ where }),
    ]);

    return { rows, total };
  }

  /**
   * Ledger LINTAS spare part — dasar halaman Stock In / Stock Out (query.type selalu
   * diisi controller, lihat QueryAllStockMovementsDto). search menyaring lewat relasi
   * sparePart.kimap/name (bukan kolom langsung di SparePartStockMovement).
   */
  async findAllMovements(query: QueryAllStockMovementsDto) {
    const where: Prisma.SparePartStockMovementWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    if (query.search) {
      where.sparePart = {
        OR: [
          { kimap: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sparePartStockMovement.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, STOCK_MOVEMENT_SORTABLE_FIELDS, 'createdAt'),
        include: {
          createdBy: { select: { id: true, fullName: true } },
          sparePart: { select: { id: true, kimap: true, name: true, unit: true } },
        },
      }),
      this.prisma.sparePartStockMovement.count({ where }),
    ]);

    return { rows, total };
  }

  /** Angka ringkasan untuk summary card Inventory Dashboard. */
  async getInventorySummary() {
    const [totalItems, activeItems, stockAgg, outOfStockCount, lowStockCount] = await this.prisma.$transaction([
      this.prisma.sparePart.count({ where: { deletedAt: null } }),
      this.prisma.sparePart.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.sparePart.aggregate({ where: { deletedAt: null }, _sum: { stock: true } }),
      this.prisma.sparePart.count({ where: { deletedAt: null, stock: 0 } }),
      // Low stock = stock > 0 tapi <= ambang (minStock) — out-of-stock dihitung terpisah
      // di atas supaya 2 angka ini tidak tumpang tindih di summary card.
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "spare_parts"
        WHERE "deleted_at" IS NULL AND "stock" > 0 AND "stock" <= "min_stock"
      `,
    ]);

    return {
      totalItems,
      activeItems,
      // stockAgg._sum.stock adalah Decimal | null sejak migrasi stock ke Decimal
      // — dikonversi ke Number di boundary repository supaya pemanggil
      // (service/dashboard) tidak perlu tahu soal tipe Decimal sama sekali.
      totalStockQty: stockAgg._sum.stock ? Number(stockAgg._sum.stock) : 0,
      outOfStockCount,
      lowStockCount: Number(lowStockCount[0]?.count ?? 0),
    };
  }

  /** Tren Stock In (RESTOCK) vs Stock Out (STOCK_OUT) per bulan, N bulan terakhir. */
  async getMonthlyStockInOut(months: number) {
    // `::numeric` (bukan `::bigint`) — quantity_delta sekarang Decimal(10,2),
    // cast ke bigint akan MEMOTONG pecahan (1.5 -> 1) alih-alih membulatkan.
    return this.prisma.$queryRaw<{ month: string; type: string; total: Decimal }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') AS month,
             "type"::text AS type,
             SUM(ABS("quantity_delta"))::numeric AS total
      FROM "spare_part_stock_movements"
      WHERE "type" IN ('RESTOCK', 'STOCK_OUT')
        AND "created_at" >= DATE_TRUNC('month', NOW()) - (${months - 1} || ' months')::interval
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `;
  }

  /** Daftar spare part yang sudah menyentuh/melewati ambang low-stock (termasuk habis). */
  findLowStockItems(limit: number) {
    return this.prisma.$queryRaw<
      { id: string; kimap: string; name: string; unit: string; stock: Decimal; minStock: Decimal }[]
    >`
      SELECT "id", "kimap", "name", "unit", "stock", "min_stock" AS "minStock"
      FROM "spare_parts"
      WHERE "deleted_at" IS NULL AND "stock" <= "min_stock"
      ORDER BY ("stock" - "min_stock") ASC, "kimap" ASC
      LIMIT ${limit}
    `;
  }
}
