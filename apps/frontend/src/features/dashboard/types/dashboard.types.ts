export interface DashboardSummary {
  totalArea: number;
  totalEquipment: number;
  openMaintenance: number;
  completedMaintenance: number;
  pmExecutionPending: number;
  sparePartLowStock: number;
}

export interface MaintenanceByMonth {
  month: string; // 'YYYY-MM'
  count: number;
}

export interface MaintenanceByArea {
  areaCode: string;
  areaName: string;
  count: number;
}

export interface MaintenanceByFailureCategory {
  category: string;
  count: number;
}

export interface PmCompliance {
  completed: number;
  pendingOnTime: number;
  overdue: number;
}

// Sebaran populasi equipment (inventory) — beda dari MaintenanceByArea di atas yang
// menghitung KEJADIAN corrective maintenance, bukan jumlah equipment itu sendiri.
export interface EquipmentByArea {
  areaCode: string;
  areaName: string;
  count: number;
}

export interface EquipmentByType {
  code: string;
  name: string;
  count: number;
}

export interface EquipmentByStatus {
  status: 'ACTIVE' | 'STANDBY' | 'OUT_OF_SERVICE';
  count: number;
}

export interface EquipmentByCriticality {
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
}

export interface DashboardCharts {
  maintenanceByMonth: MaintenanceByMonth[];
  maintenanceByArea: MaintenanceByArea[];
  maintenanceByFailureCategory: MaintenanceByFailureCategory[];
  pmCompliance: PmCompliance;
  equipmentByArea: EquipmentByArea[];
  equipmentByType: EquipmentByType[];
  equipmentByStatus: EquipmentByStatus[];
  equipmentByCriticality: EquipmentByCriticality[];
}

export interface LatestMaintenanceItem {
  id: string;
  maintenanceDate: string;
  equipment: { tagNumber: string; service: string };
  areaCode: string;
  failureCategory: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
}

export type UpcomingPmStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface UpcomingPmPeriod {
  id: string;
  periodNumber: number;
  plannedDate: string;
  programId: string;
  programName: string;
  vendorName: string;
  totalEquipment: number;
  completedEquipment: number;
  status: UpcomingPmStatus;
}

export interface DashboardRecent {
  latestMaintenance: LatestMaintenanceItem[];
  upcomingPmPeriods: UpcomingPmPeriod[];
}

export interface KpiMetrics {
  mttr: number | null; // jam, rata-rata per kejadian gagal
  mtbf: number | null; // hari, rata-rata interval antar kegagalan
  pmComplianceRate: number | null; // persen
  totalFailures: number;
  totalPmScheduled: number;
}

export interface KpiByArea extends KpiMetrics {
  areaCode: string;
  areaName?: string;
}

export interface KpiByInstrument extends KpiMetrics {
  tagNumber: string;
  service?: string;
}

export interface DashboardKpi {
  period: { months: number; from: string };
  overall: KpiMetrics;
  byArea: KpiByArea[];
  byInstrument: KpiByInstrument[];
}

export type HealthCategory = 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' | 'INSUFFICIENT_DATA';

export interface HealthIndexItem {
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
  category: HealthCategory;
}

export interface HealthIndexSummary {
  good: number;
  fair: number;
  poor: number;
  critical: number;
  insufficientData: number;
}

export interface DashboardHealthIndex {
  period: { months: number; from: string };
  summary: HealthIndexSummary;
  items: HealthIndexItem[];
}

// Harus persis sama dengan TREND_METRICS di backend
// (apps/backend/src/modules/dashboard/dto/get-trend-query.dto.ts).
export const TREND_METRICS = [
  'maintenance_total',
  'maintenance_open',
  'maintenance_in_progress',
  'maintenance_completed',
  'equipment_total',
  'equipment_active',
  'equipment_standby',
  'equipment_out_of_service',
  'kpi_failures',
  'kpi_downtime_hours',
  'kpi_pm_completed',
  'kpi_pm_pending',
  'wo_total',
  'wo_created',
  'wo_released',
  'wo_technically_completed',
  'wo_closed',
  'wo_unmatched',
] as const;

export type TrendMetric = (typeof TREND_METRICS)[number];

export interface TrendPoint {
  date: string; // yyyy-mm-dd
  value: number;
}
