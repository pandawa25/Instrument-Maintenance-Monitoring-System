import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Area } from '@prisma/client';
import { AreasRepository } from './areas.repository';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { QueryAreaDto } from './dto/query-area.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class AreasService {
  constructor(private readonly repository: AreasRepository) {}

  async findAll(query: QueryAreaDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);

    const data = rows.map((area: Area & { _count: { equipment: number } }) => ({
      id: area.id,
      areaCode: area.areaCode,
      areaName: area.areaName,
      description: area.description,
      status: area.status,
      totalEquipment: area._count.equipment,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
    }));

    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async findOne(id: string) {
    const area = await this.repository.findById(id);
    if (!area) {
      throw new NotFoundException('Area tidak ditemukan');
    }
    return {
      id: area.id,
      areaCode: area.areaCode,
      areaName: area.areaName,
      description: area.description,
      status: area.status,
      totalEquipment: area._count.equipment,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
    };
  }

  async create(dto: CreateAreaDto) {
    const existing = await this.repository.findByCode(dto.areaCode);
    if (existing) {
      throw new ConflictException(`Area code '${dto.areaCode}' sudah digunakan`);
    }
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateAreaDto) {
    await this.findOne(id); // memastikan ada & belum dihapus

    if (dto.areaCode) {
      const existing = await this.repository.findByCode(dto.areaCode);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Area code '${dto.areaCode}' sudah digunakan`);
      }
    }

    return this.repository.update(id, dto);
  }

  /**
   * Lookup non-throwing berdasarkan Area Code — dipakai oleh proses Bulk Upload Equipment
   * untuk mencocokkan kolom "Area Code" di file Excel tanpa perlu tahu UUID-nya.
   */
  findByCode(areaCode: string) {
    return this.repository.findByCode(areaCode);
  }

  async remove(id: string) {
    await this.findOne(id);

    const equipmentCount = await this.repository.countEquipment(id);
    if (equipmentCount > 0) {
      throw new ConflictException(
        `Area masih memiliki ${equipmentCount} equipment aktif — pindahkan atau nonaktifkan equipment terlebih dahulu`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
