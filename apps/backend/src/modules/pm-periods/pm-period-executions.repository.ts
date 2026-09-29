import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePmPeriodExecutionDto } from './dto/update-pm-period-execution.dto';

@Injectable()
export class PmPeriodExecutionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.pmPeriodExecution.findFirst({
      where: { id, deletedAt: null },
      include: {
        equipment: { select: { id: true, tagNumber: true, service: true } },
        pmPeriod: { select: { id: true, periodNumber: true, pmProgramId: true } },
        checklistResults: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async update(id: string, dto: UpdatePmPeriodExecutionDto) {
    const { checklistResults, executionDate, ...rest } = dto;

    return this.prisma.$transaction(async (tx: any) => {
      await tx.pmPeriodExecution.update({
        where: { id },
        data: { ...rest, executionDate: executionDate ? new Date(executionDate) : undefined },
      });

      if (checklistResults?.length) {
        for (const item of checklistResults) {
          await tx.pmExecutionChecklistResult.updateMany({
            where: { id: item.id, pmPeriodExecutionId: id },
            data: { result: item.result, notes: item.notes },
          });
        }
      }

      return tx.pmPeriodExecution.findFirst({
        where: { id },
        include: {
          equipment: { select: { id: true, tagNumber: true, service: true } },
          checklistResults: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  }
}
