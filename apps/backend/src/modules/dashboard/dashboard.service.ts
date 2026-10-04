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

type HealthCategory = 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';

interface HealthIndexItem {
  equipmentId: string;
  tagNumber: string;
  service: string;
  areaCode: string;
  areaName?: string;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  mttr: number | null;
  mtbf: number | null;
  totalFailures: number;
  hasEnoughData: boolean;
  healthScore: number | null;
  category: HealthCategory | 'INSUFFICIENT_DATA';
}

// Criticality memperbesar/memperkecil dampak dari "kekurangan" reliability
// terhadap skor akhir — bukan komponen skor terpisah. Instrument HIGH
// criticality dengan performa sama seperti instrument LOW criticality akan
// mendapat skor akhir lebih rendah (lebih mendesak untuk diperhatikan).
const CRITICALITY_DEFICIT_FACTOR: Record<'HIGH' | 'MEDIUM' | 'LOW', number> = {
  HIGH: 1.2,
  MEDIUM: 1.0,
  LOW: 0.8,
};

function categorize(score: number): HealthCategory {
  if (score >= 85) return 'GOOD';
  if (score >= 70) return 'FAIR';
  if (score >= 50) return 'POOR';
  return 'CRITICAL';
}

// Percentile rank sederhana (0 = terbaik di populasi, 1 = terburuk) dipakai
// untuk menormalkan MTTR/MTBF/failure count ke skala 0-100 relatif terhadap
// instrument lain di plant yang sama — karena kita belum punya angka acuan
// industri baku untuk plant ini.
function percentileScoreAscendingIsBad(values: number[], value: number): number {
  // dipakai untuk metrik yang "makin besar makin buruk" (MTTR, failure count)
  if (values.length <= 1) return 100;
  const worseOrEqualCount = values.filter((v) => v <= value).length - 1; // exclude diri sendiri
  const rank = worseOrEqualCount / (values.length - 1); // 0 = paling kecil/baik, 1 = paling besar/buruk
  return Math.round((1 - rank) * 100);
}

function percentileScoreAscendingIsGood(values: number[], value: number): number {
  // dipakai untuk metrik yang "makin besar makin baik" (MTBF)
  if (values.length <= 1) return 100;
  const worseOrEqualCount = values.filter((v) => v <= value).length - 1;
  const rank = worseOrEqualCount / (values.length - 1); // 0 = paling kecil/buruk, 1 = paling besar/baik
  return Math.round(rank * 100);
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

const STATUS_ORDER = ['ACTIVE', 'STANDBY', 'OUT_OF_SERVICE'] as const;
const CRITICALITY_ORDER = ['HIGH', 'MEDIUM', 'LOW'] as const;

function sortByFixedOrder<T extends Record<string, unknown>>(
  rows: T[],
  order: readonly string[],
  key: keyof T,
): T[] {
  return [...rows].sort((a, b) => order.indexOf(String(a[key])) - order.indexOf(String(b[key])));
}

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getSummary() {
    return this.repository.getSummaryCounts();
  }

  async getCharts() {
    const [
      maintenanceByArea,
      maintenanceByFailureCategory,
      pmComplianceRaw,
      maintenanceByMonth,
      equipmentByArea,
      equipmentByType,
      equipmentByStatus,
      equipmentByCriticality,
    ] = await Promise.all([
      this.repository.getMaintenanceCountByArea(),
      this.repository.getMaintenanceCountByFailureCategory(),
      this.repository.getPmComplianceCounts(),
      this.getMaintenanceTrend(),
      this.repository.getEquipmentCountByArea(),
      this.repository.getEquipmentCountByType(),
      this.repository.getEquipmentCountByStatus(),
      this.repository.getEquipmentCountByCriticality(),
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
      // Sebaran populasi equipment (inventory) — beda dari maintenanceByArea di atas yang
      // menghitung KEJADIAN corrective maintenance, bukan jumlah equipment itu sendiri.
      equipmentByArea: equipmentByArea.sort((a, b) => b.count - a.count),
      equipmentByType: equipmentByType.sort((a, b) => b.count - a.count),
      // Urutan tetap (bukan sort by count) — supaya posisi slice pie chart & legend
      // konsisten antar refresh, tidak tergantung urutan hasil groupBy Postgres.
      equipmentByStatus: sortByFixedOrder(equipmentByStatus, STATUS_ORDER, 'status'),
      equipmentByCriticality: sortByFixedOrder(equipmentByCriticality, CRITICALITY_ORDER, 'criticality'),
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

  async getHealthIndex(months?: number) {
    const rangeMonths = months && months > 0 ? months : DEFAULT_KPI_MONTHS;
    const since = new Date();
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    since.setMonth(since.getMonth() - (rangeMonths - 1));

    const [equipmentList, failures, areaLookup] = await Promise.all([
      this.repository.getActiveEquipmentForHealthIndex(),
      this.repository.getFailuresInPeriod(since),
      this.repository.getAreaLookup(),
    ]);

    // Kumpulkan raw stats per equipment dari riwayat kegagalan dalam periode.
    const statsByEquipment = new Map<string, { downtimeSum: number; downtimeCount: number; dates: Date[] }>();
    for (const f of failures as any[]) {
      let s = statsByEquipment.get(f.equipmentId);
      if (!s) {
        s = { downtimeSum: 0, downtimeCount: 0, dates: [] };
        statsByEquipment.set(f.equipmentId, s);
      }
      s.dates.push(f.maintenanceDate);
      if (f.downtimeHours !== null) {
        s.downtimeSum += Number(f.downtimeHours);
        s.downtimeCount += 1;
      }
    }

    // Baris mentah per equipment — equipment tanpa kegagalan dalam periode
    // tetap dimasukkan (sebagai "Belum Cukup Data"), bukan cuma yang punya riwayat.
    const rows = (equipmentList as any[]).map((eq) => {
      const s = statsByEquipment.get(eq.id);
      const sortedDates = s ? [...s.dates].sort((a, b) => a.getTime() - b.getTime()) : [];
      const area = areaLookup.get(eq.areaId);
      return {
        equipmentId: eq.id as string,
        tagNumber: eq.tagNumber as string,
        service: eq.service as string,
        areaCode: area?.areaCode ?? '-',
        areaName: area?.areaName ?? '-',
        criticality: eq.criticality as 'HIGH' | 'MEDIUM' | 'LOW',
        totalFailures: sortedDates.length,
        mttr: round1(s && s.downtimeCount > 0 ? s.downtimeSum / s.downtimeCount : null),
        mtbf: round1(computeMtbfDays(sortedDates)),
      };
    });

    // "Cukup data" = minimal 1 kejadian gagal tercatat dalam periode (sesuai
    // keputusan desain: equipment tanpa riwayat CM tidak dipaksa masuk skor,
    // supaya idle tidak disalahartikan sebagai reliable).
    const scorable = rows.filter((r) => r.totalFailures > 0);
    const insufficient = rows.filter((r) => r.totalFailures === 0);

    const mttrPeers = scorable.filter((r) => r.mttr !== null).map((r) => r.mttr as number);
    const mtbfPeers = scorable.filter((r) => r.mtbf !== null).map((r) => r.mtbf as number);
    const failurePeers = scorable.map((r) => r.totalFailures);

    const items: HealthIndexItem[] = scorable.map((r) => {
      const parts: { score: number; weight: number }[] = [];
      if (r.mttr !== null) parts.push({ score: percentileScoreAscendingIsBad(mttrPeers, r.mttr), weight: 0.35 });
      if (r.mtbf !== null) parts.push({ score: percentileScoreAscendingIsGood(mtbfPeers, r.mtbf), weight: 0.35 });
      parts.push({ score: percentileScoreAscendingIsBad(failurePeers, r.totalFailures), weight: 0.3 });

      const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
      const baseScore = parts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight;

      const deficit = 100 - baseScore;
      const adjusted = 100 - deficit * CRITICALITY_DEFICIT_FACTOR[r.criticality];
      const healthScore = Math.round(Math.max(0, Math.min(100, adjusted)));

      return {
        equipmentId: r.equipmentId,
        tagNumber: r.tagNumber,
        service: r.service,
        areaCode: r.areaCode,
        areaName: r.areaName,
        criticality: r.criticality,
        mttr: r.mttr,
        mtbf: r.mtbf,
        totalFailures: r.totalFailures,
        hasEnoughData: true,
        healthScore,
        category: categorize(healthScore),
      };
    });

    const insufficientItems: HealthIndexItem[] = insufficient.map((r) => ({
      equipmentId: r.equipmentId,
      tagNumber: r.tagNumber,
      service: r.service,
      areaCode: r.areaCode,
      areaName: r.areaName,
      criticality: r.criticality,
      mttr: null,
      mtbf: null,
      totalFailures: 0,
      hasEnoughData: false,
      healthScore: null,
      category: 'INSUFFICIENT_DATA',
    }));

    const allItems = [...items, ...insufficientItems].sort((a, b) => {
      if (a.healthScore === null && b.healthScore === null) return 0;
      if (a.healthScore === null) return 1;
      if (b.healthScore === null) return -1;
      return a.healthScore - b.healthScore; // paling urgent (skor terendah) dulu
    });

    const summary = {
      good: items.filter((i) => i.category === 'GOOD').length,
      fair: items.filter((i) => i.category === 'FAIR').length,
      poor: items.filter((i) => i.category === 'POOR').length,
      critical: items.filter((i) => i.category === 'CRITICAL').length,
      insufficientData: insufficientItems.length,
    };

    return {
      period: { months: rangeMonths, from: since.toISOString() },
      summary,
      items: allItems,
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
