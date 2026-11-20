import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Query mentah untuk fitur Highlight Pekerjaan — gabungan 3 sumber (Corrective Maintenance,
 * PM Period Execution, Work Order) yang is_highlighted = true. Field yang diambil SENGAJA
 * minimal (hanya yang dipakai di halaman /highlights) — field lengkap tetap di halaman
 * detail asli masing-masing modul (klik baris → link ke sana, lihat HighlightsService).
 */
@Injectable()
export class HighlightsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findHighlightedCm() {
    return this.prisma.correctiveMaintenance.findMany({
      where: { isHighlighted: true, deletedAt: null },
      orderBy: { maintenanceDate: 'desc' },
      select: {
        id: true,
        maintenanceDate: true,
        problemDescription: true,
        status: true,
        equipment: { select: { tagNumber: true, service: true } },
      },
    });
  }

  findHighlightedPmExecution() {
    return this.prisma.pmPeriodExecution.findMany({
      where: { isHighlighted: true, deletedAt: null },
      orderBy: { executionDate: 'desc' },
      select: {
        id: true,
        executionDate: true,
        status: true,
        equipment: { select: { tagNumber: true, service: true } },
        pmPeriod: { select: { periodNumber: true, pmProgram: { select: { id: true, name: true } } } },
      },
    });
  }

  findHighlightedWorkOrder() {
    return this.prisma.workOrder.findMany({
      where: { isHighlighted: true, deletedAt: null },
      orderBy: { basicStartDate: 'desc' },
      select: {
        id: true,
        orderNo: true,
        description: true,
        basicStartDate: true,
        lifecycleStage: true,
        equipment: { select: { tagNumber: true, service: true } },
      },
    });
  }
}
