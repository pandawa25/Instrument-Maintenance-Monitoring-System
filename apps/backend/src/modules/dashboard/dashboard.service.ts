import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';

const TREND_MONTHS = 12;
const LATEST_MAINTENANCE_TAKE = 10;
const UPCOMING_PM_TAKE = 5;
const DEFAULT_KPI_MONTHS = 12;

interface KpiAccumulator {
  key: string;
  label: string;
  sublabel?: string;
  downtimeSum: number;
  downtimeCount: number;
  failureDates: Date[];
  pmCompleted: number;
  pmTotal: number;
}

interface KpiResult {
  mttr: number | null;
  mtbf: number | null;
  pmComplianceRate: number | null;
  totalFailures: number;
  totalPmScheduled: number;
}

function msPerDay() {
  return 1000 * 60 * 60 * 24;
}

// MTBF = rata-rata interval (hari) antar kegagalan berurutan, dihitung dari
// tanggal-tanggal kegagalan yang sudah terurut ascending. Butuh minimal 2
// kejadian dalam periode — kalau kurang dari itu, MTBF dianggap belum bisa
// dihitung (null), bukan 0.
function computeMtbfDays(sortedDates: Date[]): number | null {
  if (sortedDates.length < 2) return null;
  let totalGapDays = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    totalGapDays += (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / msPerDay();
  }
  return totalGapDays / (sortedDates.length - 1);
}

function round1(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function finalizeKpi(acc: KpiAccumulator): KpiResult {
  const sortedDates = [...acc.failureDates].sort((a, b) => a.getTime() - b.getTime());
  return {
    mttr: round1(acc.downtimeCount > 0 ? acc.downtimeSum / acc.downtimeCount : null),
    mtbf: round1(computeMtbfDays(sortedDates)),
    pmComplianceRate: round1(acc.pmTotal > 0 ? (acc.pmCompleted / acc.pmTotal) * 100 : null),
    totalFailures: acc.failureDates.length,
    totalPmScheduled: acc.pmTotal,
  };
}

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

  async getKpi(months?: number) {
    const rangeMonths = months && months > 0 ? months : DEFAULT_KPI_MONTHS;
    const since = new Date();
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    since.setMonth(since.getMonth() - (rangeMonths - 1));

    const [failures, pmExecutions, areaLookup] = await Promise.all([
      this.repository.getFailuresInPeriod(since),
      this.repository.getPmExecutionsInPeriod(since),
      this.repository.getAreaLookup(),
    ]);

    const overallAcc: KpiAccumulator = {
      key: 'overall',
      label: 'Overall',
      downtimeSum: 0,
      downtimeCount: 0,
      failureDates: [],
      pmCompleted: 0,
      pmTotal: 0,
    };
    const byAreaAcc = new Map<string, KpiAccumulator>();
    const byEquipmentAcc = new Map<string, KpiAccumulator>();

    function getOrCreate(map: Map<string, KpiAccumulator>, key: string, label: string, sublabel?: string): KpiAccumulator {
      let acc = map.get(key);
      if (!acc) {
        acc = { key, label, sublabel, downtimeSum: 0, downtimeCount: 0, failureDates: [], pmCompleted: 0, pmTotal: 0 };
        map.set(key, acc);
      }
      return acc;
    }

    for (const f of failures as any[]) {
      const area = areaLookup.get(f.equipment.areaId);
      const areaAcc = getOrCreate(byAreaAcc, f.equipment.areaId, area?.areaCode ?? '-', area?.areaName ?? '-');
      const equipAcc = getOrCreate(byEquipmentAcc, f.equipmentId, f.equipment.tagNumber, f.equipment.service);

      overallAcc.failureDates.push(f.maintenanceDate);
      areaAcc.failureDates.push(f.maintenanceDate);
      equipAcc.failureDates.push(f.maintenanceDate);

      if (f.downtimeHours !== null) {
        const hours = Number(f.downtimeHours);
        overallAcc.downtimeSum += hours;
        overallAcc.downtimeCount += 1;
        areaAcc.downtimeSum += hours;
        areaAcc.downtimeCount += 1;
        equipAcc.downtimeSum += hours;
        equipAcc.downtimeCount += 1;
      }
    }

    for (const p of pmExecutions as any[]) {
      const area = areaLookup.get(p.equipment.areaId);
      const areaAcc = getOrCreate(byAreaAcc, p.equipment.areaId, area?.areaCode ?? '-', area?.areaName ?? '-');
      const equipAcc = getOrCreate(byEquipmentAcc, p.equipmentId, p.equipment.tagNumber, p.equipment.service);

      overallAcc.pmTotal += 1;
      areaAcc.pmTotal += 1;
      equipAcc.pmTotal += 1;
      if (p.status === 'COMPLETED') {
        overallAcc.pmCompleted += 1;
        areaAcc.pmCompleted += 1;
        equipAcc.pmCompleted += 1;
      }
    }

    return {
      period: { months: rangeMonths, from: since.toISOString() },
      overall: finalizeKpi(overallAcc),
      byArea: Array.from(byAreaAcc.values())
        .map((acc) => ({ areaCode: acc.label, areaName: acc.sublabel, ...finalizeKpi(acc) }))
        .sort((a, b) => a.areaCode.localeCompare(b.areaCode)),
      byInstrument: Array.from(byEquipmentAcc.values())
        .map((acc) => ({ tagNumber: acc.label, service: acc.sublabel, ...finalizeKpi(acc) }))
        .sort((a, b) => b.totalFailures - a.totalFailures),
    };
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
