import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentName } from '@prisma/client';
import { InstrumentNamesRepository } from './instrument-names.repository';
import { CreateInstrumentNameDto } from './dto/create-instrument-name.dto';
import { UpdateInstrumentNameDto } from './dto/update-instrument-name.dto';
import { QueryInstrumentNameDto } from './dto/query-instrument-name.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class InstrumentNamesService {
  constructor(private readonly repository: InstrumentNamesRepository) {}

  async findAll(query: QueryInstrumentNameDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);

    const data = rows.map((row: InstrumentName & { _count: { equipment: number } }) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      totalEquipment: row._count.equipment,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // Dipakai untuk dropdown (form Equipment) — tanpa pagination, tanpa hitung relasi.
  findAllForDropdown() {
    return this.repository.findAllActive();
  }

  async findOne(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Instrument name tidak ditemukan');
    }
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      totalEquipment: row._count.equipment,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(dto: CreateInstrumentNameDto) {
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Code '${dto.code}' sudah digunakan`);
    }
    const created = await this.repository.create(dto);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateInstrumentNameDto) {
    await this.findOne(id); // memastikan ada & belum dihapus

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

    const equipmentCount = await this.repository.countEquipment(id);
    if (equipmentCount > 0) {
      throw new ConflictException(
        `Instrument name masih dipakai oleh ${equipmentCount} equipment aktif — pindahkan atau nonaktifkan equipment terlebih dahulu`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
