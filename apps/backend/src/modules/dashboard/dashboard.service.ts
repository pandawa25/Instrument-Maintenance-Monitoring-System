import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';

const TREND_MONTHS = 12;
const LATEST_MAINTENANCE_TAKE = 10;
const UPCOMING_PM_TAKE = 5;

type DerivedPeriodStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

// Mengikuti logika deriveStatus di PmPeriodsService (pm-periods.service.ts) —
// disalin di sini (bukan di-import) supaya Dashboard tidak perlu bergantung
// pada module PM Periods hanya untuk 1 fungsi murni ini.
function derivePeriodStatus(plannedDate: Date, total: number, completed: number): DerivedPeriodStatus {
  if (total > 0 && completed === total) return 'COMPLETED';
  const isPastDue = plannedDate.getTime() < new Date().setHours(0, 0, 0, 0);
  if (isPastDue) return 'OVERDUE';
  if (completed > 0) return 'IN_PROGRESS';
  return 'SCHEDULED';
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getSummary() {
    return this.repository.getSummaryCounts();
  }

  async getCharts() {
    const [maintenanceByArea, maintenanceByFailureCategory, pmComplianceRaw, maintenanceByMonth] = await Promise.all([
      this.repository.getMaintenanceCountByArea(),
      this.repository.getMaintenanceCountByFailureCategory(),
      this.repository.getPmComplianceCounts(),
      this.getMaintenanceTrend(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let overdue = 0;
    let pendingOnTime = 0;
    for (const p of pmComplianceRaw.pendingExecutions) {
      if (p.pmPeriod.plannedDate.getTime() < today.getTime()) overdue++;
      else pendingOnTime++;
    }

    return {
      maintenanceByMonth,
      maintenanceByArea: maintenanceByArea.sort((a, b) => b.count - a.count),
      maintenanceByFailureCategory: maintenanceByFailureCategory.sort((a, b) => b.count - a.count),
      pmCompliance: { completed: pmComplianceRaw.completed, pendingOnTime, overdue },
    };
  }

  private async getMaintenanceTrend() {
    const since = new Date();
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    since.setMonth(since.getMonth() - (TREND_MONTHS - 1));

    const rows = await this.repository.getMaintenanceDatesLastMonths(since);

    // Zero-fill supaya bulan tanpa data tetap muncul di chart (bukan "loncat").
    const buckets = new Map<string, number>();
    for (let i = 0; i < TREND_MONTHS; i++) {
      const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
      buckets.set(monthKey(d), 0);
    }
    for (const row of rows) {
      const key = monthKey(row.maintenanceDate);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }

    return Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
  }

  async getRecent() {
    const [latestRows, upcomingRows] = await Promise.all([
      this.repository.getLatestMaintenance(LATEST_MAINTENANCE_TAKE),
      this.repository.getUpcomingPmPeriods(UPCOMING_PM_TAKE),
    ]);

    const latestMaintenance = latestRows.map((row: any) => ({
      id: row.id,
      maintenanceDate: row.maintenanceDate,
      equipment: row.equipment,
      areaCode: row.area.areaCode,
      failureCategory: row.failureCategory,
      status: row.status,
    }));

    const upcomingPmPeriods = upcomingRows.map((period: any) => {
      const total = period.executions.length;
      const completed = period.executions.filter((e: any) => e.status === 'COMPLETED').length;
      return {
        id: period.id,
        periodNumber: period.periodNumber,
        plannedDate: period.plannedDate,
        programId: period.pmProgram.id,
        programName: period.pmProgram.name,
        vendorName: period.pmProgram.vendor.name,
        totalEquipment: total,
        completedEquipment: completed,
        status: derivePeriodStatus(period.plannedDate, total, completed),
      };
    });

    return { latestMaintenance, upcomingPmPeriods };
  }
}
