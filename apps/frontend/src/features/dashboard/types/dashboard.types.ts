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

export interface DashboardCharts {
  maintenanceByMonth: MaintenanceByMonth[];
  maintenanceByArea: MaintenanceByArea[];
  maintenanceByFailureCategory: MaintenanceByFailureCategory[];
  pmCompliance: PmCompliance;
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
