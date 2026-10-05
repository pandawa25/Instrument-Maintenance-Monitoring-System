import { randomUUID } from 'crypto';
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

// Batas baris per createMany — tiap baris checklist ~7 bind variable, jadi 1000 baris
// ~7000 parameter, jauh di bawah batas 32767 parameter Postgres per query.
const INSERT_CHUNK_SIZE = 1000;

// Interactive transaction Prisma default-nya timeout 5 detik. Dengan jumlah equipment
// besar (puluhan-ratusan) di koneksi ke Postgres remote (Railway), 5 detik tidak cukup
// walau query-nya sudah dibatch. 30 detik konsisten dengan transaksi bulk di modul Equipment.
const CREATE_PERIOD_TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

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
    // Hanya periode aktif: uniqueness nomor periode bersifat partial (WHERE deleted_at IS NULL),
    // jadi nomor milik periode yang sudah dihapus boleh dipakai ulang.
    const last = await this.prisma.pmPeriod.findFirst({
      where: { pmProgramId, deletedAt: null },
      orderBy: { periodNumber: 'desc' },
      select: { periodNumber: true },
    });
    return (last?.periodNumber ?? 0) + 1;
  }

  /** Cari periode AKTIF dengan nomor tertentu di 1 program (nomor periode terhapus dianggap bebas). */
  findByNumber(pmProgramId: string, periodNumber: number) {
    return this.prisma.pmPeriod.findFirst({
      where: { pmProgramId, periodNumber, deletedAt: null },
      select: { id: true },
    });
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

      // ID execution dibuat di sisi aplikasi supaya baris execution & checklist-nya bisa
      // di-insert lewat createMany (1 query per chunk) — sebelumnya 1 create + 1 createMany
      // PER equipment secara berurutan (2N round-trip), yang jadi penyebab timeout transaksi
      // (error P2028 -> "Database error") untuk program dengan banyak equipment.
      const executions = equipmentIds.map((equipmentId) => ({
        id: randomUUID(),
        pmPeriodId: period.id,
        equipmentId,
      }));

      for (const rows of chunk(executions, INSERT_CHUNK_SIZE)) {
        await tx.pmPeriodExecution.createMany({ data: rows });
      }

      if (checklistTemplate.length) {
        const checklistRows = executions.flatMap((execution) =>
          checklistTemplate.map((item) => ({
            pmPeriodExecutionId: execution.id,
            activityTypeName: item.activityTypeName,
            description: item.description,
            sortOrder: item.sortOrder,
          })),
        );
        for (const rows of chunk(checklistRows, INSERT_CHUNK_SIZE)) {
          await tx.pmExecutionChecklistResult.createMany({ data: rows });
        }
      }

      return tx.pmPeriod.findFirst({ where: { id: period.id }, include: PERIOD_DETAIL_INCLUDE });
    }, CREATE_PERIOD_TX_OPTIONS);
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
