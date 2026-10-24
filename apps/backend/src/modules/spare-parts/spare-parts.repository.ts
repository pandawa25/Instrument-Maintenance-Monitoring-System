import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, StockMovementType } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';
import { QueryAllStockMovementsDto } from './dto/query-all-stock-movements.dto';
import { todayInOperationalZone, toDateOnly } from './stock-date.util';

// UPDATE massal Bulk Upload Spare Part — 1 parameter JSON ($1), tanpa interpolasi string.
// Kolom kosong di Excel tidak disentuh lewat set `f` (pola sama dengan equipment-bulk-sql.ts).
// `stock` SENGAJA tidak ada di sini: stok hanya berubah lewat ledger (recordMovement).
const BULK_UPDATE_SPARE_PART_SQL = `
UPDATE spare_parts AS sp SET
  name = CASE WHEN jsonb_exists(v.f, 'name') THEN v.name ELSE sp.name END,
  unit = CASE WHEN jsonb_exists(v.f, 'unit') THEN v.unit ELSE sp.unit END,
  min_stock = CASE WHEN jsonb_exists(v.f, 'min_stock') THEN v.min_stock ELSE sp.min_stock END,
  status = CASE WHEN jsonb_exists(v.f, 'status') THEN v.status::"SparePartStatus" ELSE sp.status END,
  remarks = CASE WHEN jsonb_exists(v.f, 'remarks') THEN v.remarks ELSE sp.remarks END,
  updated_at = (NOW() AT TIME ZONE 'UTC')
FROM jsonb_to_recordset($1::jsonb) AS v(id uuid, name text, unit text, min_stock numeric, status text, remarks text, f jsonb)
WHERE sp.id = v.id AND sp.deleted_at IS NULL
`;

const SPARE_PART_SORTABLE_FIELDS = ['kimap', 'name', 'stock', 'status', 'createdAt', 'updatedAt'] as const;
const STOCK_MOVEMENT_SORTABLE_FIELDS = ['type', 'quantityDelta', 'balanceAfter', 'movementDate', 'createdAt'] as const;

/**
 * Urutan ledger: default (sortBy 'createdAt' dari PaginationQueryDto, atau 'movementDate')
 * mengurutkan menurut TANGGAL TRANSAKSI lalu waktu input sebagai pemisah; kolom lain
 * mengikuti whitelist seperti biasa.
 */
function buildMovementOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
  if (sortBy === 'createdAt' || sortBy === 'movementDate') {
    return [{ movementDate: sortOrder }, { createdAt: sortOrder }];
  }
  return buildSafeOrderBy(sortBy, sortOrder, STOCK_MOVEMENT_SORTABLE_FIELDS, 'createdAt');
}

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
  // Tanggal transaksi (yyyy-mm-dd atau Date). Kosong = hari ini (zona waktu operasional).
  movementDate?: string | Date;
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

  /** Saldo awal = baris ledger INITIAL_BALANCE (0 bila part dibuat tanpa stok awal). */
  async findOpeningBalance(sparePartId: string): Promise<number> {
    const row = await this.prisma.sparePartStockMovement.findFirst({
      where: { sparePartId, referenceType: 'INITIAL_BALANCE' },
      orderBy: { createdAt: 'asc' },
      select: { quantityDelta: true },
    });
    return row ? Number(row.quantityDelta) : 0;
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

  update(id: string, dto: Omit<UpdateSparePartDto, 'openingStock'>) {
    return this.prisma.sparePart.update({ where: { id }, data: dto });
  }

  /**
   * Update field master + koreksi SALDO AWAL dalam 1 transaction.
   *
   * Saldo awal = baris ledger ADJUSTMENT/INITIAL_BALANCE (dibuat saat create / bulk upload).
   * Koreksi menulis ulang baris itu lalu menggeser `balanceAfter` semua baris SESUDAHNYA dan
   * `SparePart.stock` sebesar selisih — jadi stock tetap = saldo awal + total mutasi.
   * Part lama yang tidak punya baris saldo awal (dibuat dengan stock 0) dibuatkan barisnya,
   * di-backdate ke tanggal pembuatan part.
   *
   * Ditolak bila koreksi membuat saldo (saat ini maupun riwayat) menjadi negatif — artinya
   * mutasi keluar yang sudah tercatat tidak akan punya stok pendukung.
   */
  updateWithOpeningStock(
    id: string,
    data: Omit<UpdateSparePartDto, 'openingStock'>,
    openingStock: number,
    createdById: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const part = await tx.sparePart.findUnique({ where: { id } });
      if (!part) throw new BadRequestException(`Spare part dengan id '${id}' tidak ditemukan`);

      const opening = await tx.sparePartStockMovement.findFirst({
        where: { sparePartId: id, referenceType: 'INITIAL_BALANCE' },
        orderBy: { createdAt: 'asc' },
      });
      const cutoff: Date = opening ? opening.createdAt : new Date(0);
      const oldOpening = opening ? new Decimal(opening.quantityDelta) : new Decimal(0);
      const delta = new Decimal(openingStock).minus(oldOpening);

      if (!delta.isZero()) {
        const later = await tx.sparePartStockMovement.findMany({
          where: { sparePartId: id, ...(opening ? { id: { not: opening.id }, createdAt: { gte: cutoff } } : {}) },
          select: { balanceAfter: true },
        });
        const lowest = later.reduce(
          (min: Decimal, r: { balanceAfter: Decimal }) => Decimal.min(min, new Decimal(r.balanceAfter)),
          new Decimal(part.stock),
        );
        if (lowest.plus(delta).isNegative()) {
          throw new BadRequestException(
            `Saldo awal tidak bisa diturunkan ke ${openingStock}: stock akan menjadi negatif ` +
              `(saldo terendah pada riwayat mutasi saat ini ${lowest.toString()}, selisih ${delta.toString()})`,
          );
        }

        await tx.sparePartStockMovement.updateMany({
          where: { sparePartId: id, ...(opening ? { id: { not: opening.id }, createdAt: { gte: cutoff } } : {}) },
          data: { balanceAfter: { increment: delta } },
        });

        const note = `Saldo awal dikoreksi: ${oldOpening.toString()} → ${openingStock}`;
        if (opening) {
          await tx.sparePartStockMovement.update({
            where: { id: opening.id },
            data: { quantityDelta: openingStock, balanceAfter: openingStock, notes: note },
          });
        } else {
          await tx.sparePartStockMovement.create({
            data: {
              sparePartId: id,
              type: 'ADJUSTMENT',
              quantityDelta: openingStock,
              balanceAfter: openingStock,
              referenceType: 'INITIAL_BALANCE',
              notes: note,
              movementDate: toDateOnly(part.createdAt),
              createdById,
              createdAt: part.createdAt,
            },
          });
        }
        await tx.sparePart.update({ where: { id }, data: { stock: { increment: delta } } });
      }

      if (Object.keys(data).length > 0) {
        await tx.sparePart.update({ where: { id }, data });
      }
      return tx.sparePart.findUnique({ where: { id } });
    });
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
  /**
   * Semua spare part termasuk yang sudah di-soft-delete — kolom `kimap` unique di DB tanpa
   * mempedulikan deleted_at, jadi KIMAP milik part terhapus tetap tidak bisa dipakai ulang.
   * Dipakai Bulk Upload untuk validasi tanpa query per baris.
   */
  async findAllForBulk() {
    return this.prisma.sparePart.findMany({
      select: { id: true, kimap: true, name: true, unit: true, minStock: true, status: true, remarks: true, deletedAt: true },
    });
  }

  /**
   * Terapkan hasil Bulk Upload dalam SATU transaksi. Dirancang konstan terhadap jumlah baris
   * (round-trip ke DB Railway mahal, lihat docs/roadmap.md Risk #21): CREATE = createMany per
   * 500 baris, UPDATE = 1 statement `UPDATE ... FROM jsonb_to_recordset` per 500 baris.
   *
   * Stok awal part baru ditulis langsung (stock = saldo awal) bersama 1 baris ledger ADJUSTMENT
   * INITIAL_BALANCE per part — hasil akhirnya identik dengan createWithInitialStock() (jalur
   * create manual), hanya saja dibatch. Stok part yang sudah ada TIDAK pernah disentuh di sini.
   */
  async applyBulk(params: {
    creates: { kimap: string; name: string; unit: string; stock: number; minStock: number; status: string; remarks?: string }[];
    updates: { id: string; name?: string; unit?: string; minStock?: number; status?: string; remarks?: string }[];
    createdById: string;
  }): Promise<{ created: number; updated: number }> {
    const movementDate = toDateOnly(todayInOperationalZone());
    const CHUNK = 500;

    return this.prisma.$transaction(
      async (tx: any) => {
        for (let i = 0; i < params.creates.length; i += CHUNK) {
          const slice = params.creates.slice(i, i + CHUNK).map((c) => ({ id: randomUUID(), ...c }));
          await tx.sparePart.createMany({
            data: slice.map((c) => ({
              id: c.id,
              kimap: c.kimap,
              name: c.name,
              unit: c.unit,
              stock: c.stock,
              minStock: c.minStock,
              status: c.status,
              remarks: c.remarks,
            })),
          });
          const withStock = slice.filter((c) => c.stock > 0);
          if (withStock.length > 0) {
            await tx.sparePartStockMovement.createMany({
              data: withStock.map((c) => ({
                sparePartId: c.id,
                type: 'ADJUSTMENT' as StockMovementType,
                quantityDelta: c.stock,
                balanceAfter: c.stock,
                referenceType: 'INITIAL_BALANCE',
                notes: 'Saldo awal dari bulk upload',
                movementDate,
                createdById: params.createdById,
              })),
            });
          }
        }

        for (let i = 0; i < params.updates.length; i += CHUNK) {
          const slice = params.updates.slice(i, i + CHUNK);
          const records = slice.map((u) => {
            const f: Record<string, true> = {};
            const record: Record<string, unknown> = { id: u.id };
            const optional: [string, unknown][] = [
              ['name', u.name],
              ['unit', u.unit],
              ['min_stock', u.minStock],
              ['status', u.status],
              ['remarks', u.remarks],
            ];
            for (const [column, value] of optional) {
              if (value !== undefined) {
                record[column] = value;
                f[column] = true;
              }
            }
            record.f = f;
            return record;
          });
          const affected = await tx.$executeRawUnsafe(BULK_UPDATE_SPARE_PART_SQL, JSON.stringify(records));
          if (affected !== slice.length) {
            throw new ConflictException(
              `Update massal hanya mengenai ${affected} dari ${slice.length} baris — sebagian spare part terhapus sejak preview. Upload & preview ulang file.`,
            );
          }
        }

        return { created: params.creates.length, updated: params.updates.length };
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
  }

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
        movementDate: toDateOnly(params.movementDate ?? todayInOperationalZone()),
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
        orderBy: buildMovementOrderBy(query.sortBy, query.sortOrder),
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

    if (query.types?.length) {
      where.type = { in: query.types };
    } else if (query.type) {
      where.type = query.type;
    }

    // Filter menurut TANGGAL TRANSAKSI (kolom DATE) — bukan waktu input, supaya entri
    // yang dicatat belakangan tetap masuk ke periode transaksi yang benar.
    if (query.dateFrom || query.dateTo) {
      where.movementDate = {
        ...(query.dateFrom ? { gte: toDateOnly(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: toDateOnly(query.dateTo) } : {}),
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
        orderBy: buildMovementOrderBy(query.sortBy, query.sortOrder),
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

  /**
   * Tren Stock In vs Stock Out per bulan (menurut TANGGAL TRANSAKSI), N bulan terakhir.
   * Stock Out = pengeluaran manual + pemakaian Corrective Maintenance, NETTO dari pengembalian
   * (MAINTENANCE_RETURN) — dihitung sebagai -SUM(quantity_delta) sehingga return mengurangi total.
   */
  async getMonthlyStockInOut(months: number) {
    // `::numeric` (bukan `::bigint`) — quantity_delta Decimal(10,2), cast ke bigint memotong pecahan.
    return this.prisma.$queryRaw<{ month: string; direction: string; total: Decimal }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "movement_date"), 'YYYY-MM') AS month,
             CASE WHEN "type" = 'RESTOCK' THEN 'IN' ELSE 'OUT' END AS direction,
             SUM(CASE WHEN "type" = 'RESTOCK' THEN "quantity_delta" ELSE -"quantity_delta" END)::numeric AS total
      FROM "spare_part_stock_movements"
      WHERE "type" IN ('RESTOCK', 'STOCK_OUT', 'MAINTENANCE_USAGE', 'MAINTENANCE_RETURN')
        AND "movement_date" >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Jakarta')::date) - (${months - 1} || ' months')::interval
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `;
  }

  /**
   * Info Corrective Maintenance untuk baris ledger yang berasal dari CM (referenceType
   * CORRECTIVE_MAINTENANCE) — dipakai kolom "Sumber" di halaman Stock Out. Tidak ada FK ke
   * tabel CM, jadi diambil sekali per halaman. CM yang sudah dihapus tetap dikembalikan
   * (deletedAt terisi) supaya histori tidak kehilangan referensinya.
   */
  findMaintenanceRefs(ids: string[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.prisma.correctiveMaintenance.findMany({
      where: { id: { in: ids } },
      select: { id: true, spkNumber: true, deletedAt: true, equipment: { select: { tagNumber: true } } },
    });
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
