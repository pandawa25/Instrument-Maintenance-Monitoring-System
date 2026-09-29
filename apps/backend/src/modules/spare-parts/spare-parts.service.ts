import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SparePart } from '@prisma/client';
import { SparePartsRepository } from './spare-parts.repository';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class SparePartsService {
  constructor(private readonly repository: SparePartsRepository) {}

  private toListItem(row: SparePart) {
    return {
      id: row.id,
      kimap: row.kimap,
      name: row.name,
      unit: row.unit,
      stock: row.stock,
      status: row.status,
      remarks: row.remarks,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(query: QuerySparePartDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);
    const data = rows.map((row: SparePart) => this.toListItem(row));
    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // Dipakai untuk dropdown (form Corrective Maintenance) — tanpa pagination.
  findAllForDropdown() {
    return this.repository.findAllForDropdown();
  }

  async findOne(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Spare part / material tidak ditemukan');
    }
    return this.toListItem(row);
  }

  async create(dto: CreateSparePartDto, createdById: string) {
    const existing = await this.repository.findByKimap(dto.kimap);
    if (existing) {
      throw new ConflictException(`KIMAP '${dto.kimap}' sudah dipakai spare part lain`);
    }
    // Stock 0 dibuat dulu, lalu stock awal (jika ada) dicatat sebagai 1 baris
    // ledger ADJUSTMENT dalam transaction yang sama — lihat repository.
    const created = await this.repository.createWithInitialStock(dto, createdById);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateSparePartDto) {
    await this.findOne(id); // memastikan ada & belum dihapus

    if (dto.kimap) {
      const existing = await this.repository.findByKimap(dto.kimap);
      if (existing && existing.id !== id) {
        throw new ConflictException(`KIMAP '${dto.kimap}' sudah dipakai spare part lain`);
      }
    }

    await this.repository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);

    const usageCount = await this.repository.countUsage(id);
    if (usageCount > 0) {
      throw new ConflictException(
        `Spare part ini masih dipakai pada ${usageCount} data Corrective Maintenance — tidak bisa dihapus`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }

  /**
   * Satu-satunya jalur manual untuk mengubah stock setelah spare part dibuat —
   * RESTOCK (penambahan stock baru, wajib positif) atau ADJUSTMENT (koreksi
   * hasil stock opname, boleh +/-). MAINTENANCE_USAGE/MAINTENANCE_RETURN tidak
   * pernah lewat sini — itu otomatis dari MaintenanceRepository.
   */
  async createMovement(sparePartId: string, dto: CreateStockMovementDto, createdById: string) {
    await this.findOne(sparePartId); // 404 check

    if (dto.type === 'RESTOCK' && dto.quantityDelta <= 0) {
      throw new BadRequestException('RESTOCK harus bernilai positif');
    }

    await this.repository.createManualMovement({
      sparePartId,
      type: dto.type,
      quantityDelta: dto.quantityDelta,
      notes: dto.notes,
      createdById,
    });

    return this.findOne(sparePartId);
  }

  async listMovements(sparePartId: string, query: QueryStockMovementDto): Promise<PaginatedResult<unknown>> {
    await this.findOne(sparePartId); // 404 check

    const { rows, total } = await this.repository.findMovements(sparePartId, query);
    const data = rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      quantityDelta: row.quantityDelta,
      balanceAfter: row.balanceAfter,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    }));

    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}
