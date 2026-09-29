import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SparePart } from '@prisma/client';
import { SparePartsRepository } from './spare-parts.repository';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
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

  async create(dto: CreateSparePartDto) {
    const existing = await this.repository.findByKimap(dto.kimap);
    if (existing) {
      throw new ConflictException(`KIMAP '${dto.kimap}' sudah dipakai spare part lain`);
    }
    const created = await this.repository.create(dto);
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
}
