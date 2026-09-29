import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';

interface RecordMovementParams {
  sparePartId: string;
  type: StockMovementType;
  quantityDelta: number;
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
        orderBy: { [query.sortBy]: query.sortOrder },
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
  async recordMovement(tx: any, params: RecordMovementParams): Promise<number> {
    const sparePart = await tx.sparePart.findUnique({ where: { id: params.sparePartId } });
    if (!sparePart) {
      throw new BadRequestException(`Spare part dengan id '${params.sparePartId}' tidak ditemukan`);
    }

    const balanceAfter = sparePart.stock + params.quantityDelta;
    if (balanceAfter < 0) {
      throw new BadRequestException(
        `Stock spare part '${sparePart.kimap}' tidak cukup (tersedia ${sparePart.stock}, dibutuhkan ${-params.quantityDelta})`,
      );
    }

    await tx.sparePart.update({ where: { id: params.sparePartId }, data: { stock: balanceAfter } });
    await tx.sparePartStockMovement.create({
      data: {
        sparePartId: params.sparePartId,
        type: params.type,
        quantityDelta: params.quantityDelta,
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
        orderBy: { [query.sortBy]: query.sortOrder },
        include: { createdBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.sparePartStockMovement.count({ where }),
    ]);

    return { rows, total };
  }
}
