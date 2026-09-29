import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const LOW_STOCK_THRESHOLD = 5;

/**
 * Satu-satunya tempat yang bicara langsung ke Prisma untuk agregat Dashboard.
 * Read-only murni — tidak ada mutasi di sini. Query dibuat lintas modul
 * (Area, Equipment, Corrective Maintenance, PM, Spare Part) langsung lewat
 * PrismaService supaya Dashboard tidak perlu import banyak module lain
 * hanya untuk baca data ringkas.
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryCounts() {
    const [totalArea, totalEquipment, openMaintenance, completedMaintenance, pmExecutionPending, sparePartLowStock] =
      await Promise.all([
        this.prisma.area.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
        this.prisma.equipment.count({ where: { deletedAt: null } }),
        this.prisma.correctiveMaintenance.count({
          where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
        this.prisma.correctiveMaintenance.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
        this.prisma.pmPeriodExecution.count({ where: { deletedAt: null, status: 'PENDING' } }),
        this.prisma.sparePart.count({
          where: { deletedAt: null, status: 'ACTIVE', stock: { lte: LOW_STOCK_THRESHOLD } },
        }),
      ]);

    return { totalArea, totalEquipment, openMaintenance, completedMaintenance, pmExecutionPending, sparePartLowStock };
  }

  // Tren 12 bulan terakhir — di-zero-fill di service supaya bulan tanpa data tetap muncul di chart.
  async getMaintenanceDatesLastMonths(since: Date) {
    return this.prisma.correctiveMaintenance.findMany({
      where: { deletedAt: null, maintenanceDate: { gte: since } },
      select: { maintenanceDate: true },
    });
  }

  async getMaintenanceCountByArea() {
    const grouped = await this.prisma.correctiveMaintenance.groupBy({
      by: ['areaId'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const areas = await this.prisma.area.findMany({
      where: { id: { in: grouped.map((g) => g.areaId) } },
      select: { id: true, areaCode: true, areaName: true },
    });
    const areaMap = new Map(areas.map((a) => [a.id, a]));

    return grouped.map((g) => ({
      areaCode: areaMap.get(g.areaId)?.areaCode ?? '-',
      areaName: areaMap.get(g.areaId)?.areaName ?? '-',
      count: g._count._all,
    }));
  }

  async getMaintenanceCountByFailureCategory() {
    const grouped = await this.prisma.correctiveMaintenance.groupBy({
      by: ['failureCategory'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    return grouped.map((g) => ({ category: g.failureCategory, count: g._count._all }));
  }

  async getPmComplianceCounts() {
    const [completed, pendingExecutions] = await Promise.all([
      this.prisma.pmPeriodExecution.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
      this.prisma.pmPeriodExecution.findMany({
        where: { deletedAt: null, status: 'PENDING' },
        select: { pmPeriod: { select: { plannedDate: true } } },
      }),
    ]);

    return { completed, pendingExecutions };
  }

  getLatestMaintenance(take: number) {
    return this.prisma.correctiveMaintenance.findMany({
      where: { deletedAt: null },
      orderBy: { maintenanceDate: 'desc' },
      take,
      select: {
        id: true,
        maintenanceDate: true,
        failureCategory: true,
        status: true,
        equipment: { select: { tagNumber: true, service: true } },
        area: { select: { areaCode: true } },
      },
    });
  }

  // Periode PM yang masih punya eksekusi PENDING — urut yang paling mendesak (plannedDate terdekat) dulu.
  getUpcomingPmPeriods(take: number) {
    return this.prisma.pmPeriod.findMany({
      where: { deletedAt: null, executions: { some: { status: 'PENDING' } } },
      orderBy: { plannedDate: 'asc' },
      take,
      include: {
        pmProgram: { select: { id: true, name: true, vendor: { select: { name: true } } } },
        executions: { select: { status: true } },
      },
    });
  }
}
