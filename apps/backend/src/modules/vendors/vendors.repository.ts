import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';

const SORTABLE_FIELDS = ['name', 'status', 'createdAt', 'updatedAt'] as const;
import { QueryVendorDto } from './dto/query-vendor.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Vendor.
 * Mengikuti pola yang sama dengan AreasRepository.
 */
@Injectable()
export class VendorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryVendorDto): Prisma.VendorWhereInput {
    const where: Prisma.VendorWhereInput = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: QueryVendorDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SORTABLE_FIELDS, 'createdAt'),
        include: { _count: { select: { pmPrograms: true } } },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return { rows, total };
  }

  findAllActive() {
    return this.prisma.vendor.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.vendor.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { pmPrograms: true } } },
    });
  }

  create(dto: CreateVendorDto) {
    return this.prisma.vendor.create({ data: dto });
  }

  update(id: string, dto: UpdateVendorDto) {
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  softDelete(id: string) {
    return this.prisma.vendor.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countPrograms(vendorId: string) {
    return this.prisma.pmProgram.count({ where: { vendorId, deletedAt: null } });
  }
}
