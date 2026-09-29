import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePmPeriodDto } from './dto/update-pm-period.dto';

const PERIOD_DETAIL_INCLUDE = {
  executions: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      equipment: { select: { id: true, tagNumber: true, service: true } },
      checklistResults: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
} satisfies Prisma.PmPeriodInclude;

interface ChecklistTemplateItem {
  activityTypeName: string;
  description: string | null;
  sortOrder: number;
}

@Injectable()
export class PmPeriodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByProgram(pmProgramId: string) {
    return this.prisma.pmPeriod.findMany({
      where: { pmProgramId, deletedAt: null },
      orderBy: { periodNumber: 'desc' },
      include: { executions: { select: { status: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.pmPeriod.findFirst({
      where: { id, deletedAt: null },
      include: { ...PERIOD_DETAIL_INCLUDE, pmProgram: { select: { id: true, name: true } } },
    });
  }

  async getNextPeriodNumber(pmProgramId: string): Promise<number> {
    const last = await this.prisma.pmPeriod.findFirst({
      where: { pmProgramId, deletedAt: null },
      orderBy: { periodNumber: 'desc' },
      select: { periodNumber: true },
    });
    return (last?.periodNumber ?? 0) + 1;
  }

  async createWithExecutions(
    pmProgramId: string,
    periodNumber: number,
    plannedDate: string,
    remarks: string | undefined,
    equipmentIds: string[],
    checklistTemplate: ChecklistTemplateItem[],
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const period = await tx.pmPeriod.create({
        data: { pmProgramId, periodNumber, plannedDate: new Date(plannedDate), remarks },
      });

      for (const equipmentId of equipmentIds) {
        const execution = await tx.pmPeriodExecution.create({
          data: { pmPeriodId: period.id, equipmentId },
        });

        if (checklistTemplate.length) {
          await tx.pmExecutionChecklistResult.createMany({
            data: checklistTemplate.map((item) => ({
              pmPeriodExecutionId: execution.id,
              activityTypeName: item.activityTypeName,
              description: item.description,
              sortOrder: item.sortOrder,
            })),
          });
        }
      }

      return tx.pmPeriod.findFirst({ where: { id: period.id }, include: PERIOD_DETAIL_INCLUDE });
    });
  }

  update(id: string, dto: UpdatePmPeriodDto) {
    const { plannedDate, ...rest } = dto;
    return this.prisma.pmPeriod.update({
      where: { id },
      data: { ...rest, plannedDate: plannedDate ? new Date(plannedDate) : undefined },
    });
  }

  softDelete(id: string) {
    return this.prisma.pmPeriod.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countCompletedExecutions(pmPeriodId: string) {
    return this.prisma.pmPeriodExecution.count({ where: { pmPeriodId, status: 'COMPLETED' } });
  }
}
