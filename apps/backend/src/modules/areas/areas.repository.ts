import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';

const SORTABLE_FIELDS = ['areaCode', 'areaName', 'status', 'createdAt', 'updatedAt'] as const;
import { QueryAreaDto } from './dto/query-area.dto';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain Area.
 * AreasService tidak pernah import PrismaService — jika query agregat
 * (mis. untuk dashboard) dibutuhkan nanti, tambahkan method di sini.
 */
@Injectable()
export class AreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryAreaDto): Prisma.AreaWhereInput {
    const where: Prisma.AreaWhereInput = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { areaCode: { contains: query.search, mode: 'insensitive' } },
        { areaName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: QueryAreaDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.area.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SORTABLE_FIELDS, 'createdAt'),
        include: { _count: { select: { equipment: true } } },
      }),
      this.prisma.area.count({ where }),
    ]);

    return { rows, total };
  }

  findById(id: string) {
    return this.prisma.area.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { equipment: true } } },
    });
  }

  findByCode(areaCode: string) {
    return this.prisma.area.findFirst({ where: { areaCode, deletedAt: null } });
  }

  // Dipakai EquipmentImportService untuk preload semua area aktif ke Map sekali di awal
  // (bukan findByCode per baris) — menghindari N+1 query saat validasi bulk upload.
  findAllActive() {
    return this.prisma.area.findMany({ where: { deletedAt: null }, orderBy: { areaCode: 'asc' } });
  }

  create(dto: CreateAreaDto) {
    return this.prisma.area.create({ data: dto });
  }

  update(id: string, dto: UpdateAreaDto) {
    return this.prisma.area.update({ where: { id }, data: dto });
  }

  softDelete(id: string) {
    return this.prisma.area.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countEquipment(areaId: string) {
    return this.prisma.equipment.count({ where: { areaId, deletedAt: null } });
  }
}
