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
