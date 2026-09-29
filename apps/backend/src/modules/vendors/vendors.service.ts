import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Vendor } from '@prisma/client';
import { VendorsRepository } from './vendors.repository';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly repository: VendorsRepository) {}

  async findAll(query: QueryVendorDto): Promise<PaginatedResult<unknown>> {
    const { rows, total } = await this.repository.findMany(query);

    const data = rows.map((row: Vendor & { _count: { pmPrograms: number } }) => ({
      id: row.id,
      name: row.name,
      contactPerson: row.contactPerson,
      phone: row.phone,
      email: row.email,
      address: row.address,
      status: row.status,
      remarks: row.remarks,
      totalPmProgram: row._count.pmPrograms,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // Dipakai untuk dropdown (form PM Program) — tanpa pagination.
  findAllForDropdown() {
    return this.repository.findAllActive();
  }

  async findOne(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Vendor tidak ditemukan');
    }
    return {
      id: row.id,
      name: row.name,
      contactPerson: row.contactPerson,
      phone: row.phone,
      email: row.email,
      address: row.address,
      status: row.status,
      remarks: row.remarks,
      totalPmProgram: row._count.pmPrograms,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(dto: CreateVendorDto) {
    const created = await this.repository.create(dto);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateVendorDto) {
    await this.findOne(id); // memastikan ada & belum dihapus
    await this.repository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);

    const programCount = await this.repository.countPrograms(id);
    if (programCount > 0) {
      throw new ConflictException(
        `Vendor masih memiliki ${programCount} PM Program aktif — nonaktifkan atau pindahkan program terlebih dahulu`,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
