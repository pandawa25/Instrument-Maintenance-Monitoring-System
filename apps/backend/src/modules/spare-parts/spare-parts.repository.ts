import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QuerySparePartDto } from './dto/query-spare-part.dto';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';

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

  create(dto: CreateSparePartDto) {
    return this.prisma.sparePart.create({ data: dto });
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
}
