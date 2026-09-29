import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryPmActivityTypeDto } from './dto/query-pm-activity-type.dto';
import { CreatePmActivityTypeDto } from './dto/create-pm-activity-type.dto';
import { UpdatePmActivityTypeDto } from './dto/update-pm-activity-type.dto';

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain PM Activity Type
 * (master jenis aktifitas PM — Cleaning, Calibration, dst).
 */
@Injectable()
export class PmActivityTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryPmActivityTypeDto): Prisma.PmActivityTypeWhereInput {
    const where: Prisma.PmActivityTypeWhereInput = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: QueryPmActivityTypeDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.pmActivityType.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: { _count: { select: { checklistItems: true } } },
      }),
      this.prisma.pmActivityType.count({ where }),
    ]);

    return { rows, total };
  }

  findAllActive() {
    return this.prisma.pmActivityType.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.pmActivityType.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { checklistItems: true } } },
    });
  }

  findByCode(code: string) {
    return this.prisma.pmActivityType.findFirst({ where: { code, deletedAt: null } });
  }

  create(dto: CreatePmActivityTypeDto) {
    return this.prisma.pmActivityType.create({ data: dto });
  }

  update(id: string, dto: UpdatePmActivityTypeDto) {
    return this.prisma.pmActivityType.update({ where: { id }, data: dto });
  }

  softDelete(id: string) {
    return this.prisma.pmActivityType.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countChecklistItems(id: string) {
    return this.prisma.pmChecklistItem.count({ where: { activityTypeId: id, deletedAt: null } });
  }
}
