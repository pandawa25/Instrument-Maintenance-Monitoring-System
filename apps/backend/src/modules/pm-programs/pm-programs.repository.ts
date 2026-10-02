import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSafeOrderBy } from '../../common/utils/safe-order-by.util';

const SORTABLE_FIELDS = ['name', 'startDate', 'status', 'createdAt', 'updatedAt'] as const;
import { QueryPmProgramDto } from './dto/query-pm-program.dto';
import { CreatePmProgramDto } from './dto/create-pm-program.dto';
import { UpdatePmProgramDto } from './dto/update-pm-program.dto';

const DETAIL_INCLUDE = {
  vendor: { select: { id: true, name: true } },
  equipment: {
    include: {
      equipment: {
        select: { id: true, tagNumber: true, service: true, area: { select: { areaCode: true } } },
      },
    },
  },
  checklistItems: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' as const },
    include: { activityType: { select: { id: true, code: true, name: true } } },
  },
  _count: { select: { periods: true } },
} satisfies Prisma.PmProgramInclude;

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk domain PM Program.
 * create/update menangani nested equipment (join) & checklist item dalam 1 transaction
 * (replace-all pattern — form Program dikirim utuh setiap simpan).
 */
@Injectable()
export class PmProgramsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryPmProgramDto): Prisma.PmProgramWhereInput {
    const where: Prisma.PmProgramWhereInput = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }
    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }
    if (query.equipmentId) {
      where.equipment = { some: { equipmentId: query.equipmentId } };
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    return where;
  }

  async findMany(query: QueryPmProgramDto) {
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.pmProgram.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: buildSafeOrderBy(query.sortBy, query.sortOrder, SORTABLE_FIELDS, 'createdAt'),
        include: {
          vendor: { select: { id: true, name: true } },
          _count: { select: { equipment: true, periods: true } },
        },
      }),
      this.prisma.pmProgram.count({ where }),
    ]);

    return { rows, total };
  }

  findById(id: string) {
    return this.prisma.pmProgram.findFirst({ where: { id, deletedAt: null }, include: DETAIL_INCLUDE });
  }

  create(dto: CreatePmProgramDto) {
    const { equipmentIds, checklistItems, startDate, ...rest } = dto;

    return this.prisma.pmProgram.create({
      data: {
        ...rest,
        startDate: new Date(startDate),
        equipment: { createMany: { data: equipmentIds.map((equipmentId) => ({ equipmentId })) } },
        checklistItems: checklistItems?.length
          ? {
              createMany: {
                data: checklistItems.map((item, index) => ({
                  activityTypeId: item.activityTypeId,
                  description: item.description,
                  sortOrder: item.sortOrder ?? index,
                })),
              },
            }
          : undefined,
      },
      include: DETAIL_INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePmProgramDto) {
    const { equipmentIds, checklistItems, startDate, ...rest } = dto;

    return this.prisma.$transaction(async (tx: any) => {
      await tx.pmProgram.update({
        where: { id },
        data: { ...rest, startDate: startDate ? new Date(startDate) : undefined },
      });

      if (equipmentIds) {
        await tx.pmProgramEquipment.deleteMany({ where: { pmProgramId: id } });
        await tx.pmProgramEquipment.createMany({
          data: equipmentIds.map((equipmentId) => ({ pmProgramId: id, equipmentId })),
        });
      }

      if (checklistItems) {
        await tx.pmChecklistItem.deleteMany({ where: { pmProgramId: id } });
        if (checklistItems.length) {
          await tx.pmChecklistItem.createMany({
            data: checklistItems.map((item, index) => ({
              pmProgramId: id,
              activityTypeId: item.activityTypeId,
              description: item.description,
              sortOrder: item.sortOrder ?? index,
            })),
          });
        }
      }

      return tx.pmProgram.findFirst({ where: { id }, include: DETAIL_INCLUDE });
    });
  }

  softDelete(id: string) {
    return this.prisma.pmProgram.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countPeriods(id: string) {
    return this.prisma.pmPeriod.count({ where: { pmProgramId: id, deletedAt: null } });
  }
}
