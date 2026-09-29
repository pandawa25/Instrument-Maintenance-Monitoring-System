import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PmActivityType } from '@prisma/client';
import { PmActivityTypesRepository } from './pm-activity-types.repository';
import { CreatePmActivityTypeDto } from './dto/create-pm-activity-type.dto';
import { UpdatePmActivityTypeDto } from './dto/update-pm-activity-type.dto';
import { QueryPmActivityTypeDto } from './dto/query-pm-activity-type.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class PmActivityTypesService {
  constructor(private readonly repository: PmActivityTypesRepository) {}

  async findAll(query: QueryPmActivityTypeDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);

    const data = rows.map((row: PmActivityType & { _count: { checklistItems: number } }) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      totalChecklistItem: row._count.checklistItems,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // Dipakai untuk dropdown (checklist builder PM Program) — tanpa pagination.
  findAllForDropdown() {
    return this.repository.findAllActive();
  }

  async findOne(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('PM Activity Type tidak ditemukan');
    }
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      totalChecklistItem: row._count.checklistItems,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(dto: CreatePmActivityTypeDto) {
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Code '${dto.code}' sudah digunakan`);
    }
    const created = await this.repository.create(dto);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdatePmActivityTypeDto) {
    await this.findOne(id);

    if (dto.code) {
      const existing = await this.repository.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Code '${dto.code}' sudah digunakan`);
      }
    }

    await this.repository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);

    const count = await this.repository.countChecklistItems(id);
    if (count > 0) {
      throw new ConflictException(
        `Activity type masih dipakai oleh ${count} checklist item PM Program — hapus/ubah checklist item tersebut terlebih dahulu`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
