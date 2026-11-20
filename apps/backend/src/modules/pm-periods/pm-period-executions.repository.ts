import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePmPeriodExecutionDto } from './dto/update-pm-period-execution.dto';

// Update checklist berjalan sequential (satu updateMany per item); default timeout
// interactive transaction Prisma hanya 5 detik (P2028) sehingga checklist panjang rawan gagal.
const UPDATE_EXECUTION_TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

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
    const { checklistResults, executionDate, workOrderDate, ...rest } = dto;

    // Fitur Highlight Pekerjaan: begitu status BERUBAH jadi Completed, batalkan highlight
    // otomatis (bukan issue aktif lagi) — lihat juga catatan di schema.prisma
    // PmPeriodExecution.isHighlighted. dto.status di sini sudah hasil resolusi
    // PmPeriodExecutionsService.update() (termasuk auto-complete saat executionDate+result diisi).
    const willBeDone = dto.status === 'COMPLETED';

    return this.prisma.$transaction(async (tx: any) => {
      await tx.pmPeriodExecution.update({
        where: { id },
        data: {
          ...rest,
          ...(willBeDone ? { isHighlighted: false } : {}),
          executionDate: executionDate ? new Date(executionDate) : undefined,
          workOrderDate: workOrderDate ? new Date(workOrderDate) : undefined,
        },
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
    }, UPDATE_EXECUTION_TX_OPTIONS);
  }

  /** Toggle fitur Highlight Pekerjaan — lihat PmPeriodExecutionsService.setHighlighted() untuk guard-nya. */
  async setHighlighted(id: string, isHighlighted: boolean) {
    await this.prisma.pmPeriodExecution.update({ where: { id }, data: { isHighlighted } });
    return this.findById(id);
  }
}
