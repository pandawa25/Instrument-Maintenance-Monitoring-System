export type FailureCategory =
  | 'INSTRUMENT'
  | 'ELECTRICAL'
  | 'MECHANICAL'
  | 'COMMUNICATION'
  | 'CONFIGURATION'
  | 'CALIBRATION'
  | 'PROCESS';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_MATERIAL' | 'COMPLETED' | 'CANCELLED';

// Reuse skala yang sama dengan Equipment.criticality (HIGH/MEDIUM/LOW).
export type MaintenancePriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface EquipmentRef {
  id: string;
  tagNumber: string;
  service: string;
}

export interface AreaRef {
  id: string;
  areaCode: string;
  areaName: string;
}

export interface TechnicianRef {
  id: string;
  fullName: string;
}

export interface SparePartRef {
  id: string;
  kimap: string;
  name: string;
  unit: string;
}

export interface MaintenanceMaterial {
  id: string;
  quantity: string | number;
  remarks: string | null;
  sparePart: SparePartRef;
}

export interface Maintenance {
  id: string;
  spkNumber: string;
  maintenanceDate: string;
  equipment: EquipmentRef;
  area: AreaRef;
  failureCategory: FailureCategory;
  problemDescription: string;
  rootCause: string | null;
  actionTaken: string | null;
  downtimeHours: string | number | null;
  technician: TechnicianRef;
  additionalTechnicians: TechnicianRef[];
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  completionDate: string | null;
  createdBy: TechnicianRef;
  remarks: string | null;
  needsSparePart: boolean;
  materials: MaintenanceMaterial[];
  notificationNumber: string | null;
  notificationDate: string | null;
  notificationStatus: string | null;
  workOrderNumber: string | null;
  workOrderDate: string | null;
  workOrderStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialFormItem {
  sparePartId: string;
  quantity: number | string;
  remarks?: string;
}

export interface MaintenanceFormValues {
  maintenanceDate: string;
  equipmentId: string;
  failureCategory: FailureCategory;
  problemDescription: string;
  rootCause?: string;
  actionTaken?: string;
  downtimeHours?: number | string;
  technicianId: string;
  additionalTechnicianIds: string[];
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  completionDate?: string;
  remarks?: string;
  needsSparePart: boolean;
  materials: MaterialFormItem[];
  notificationNumber?: string;
  notificationDate?: string;
  notificationStatus?: string;
  workOrderNumber?: string;
  workOrderDate?: string;
  workOrderStatus?: string;
}

export interface MaintenanceQueryParams {
  page: number;
  limit: number;
  search?: string;
  areaId?: string | '';
  equipmentId?: string | '';
  status?: MaintenanceStatus | '';
  priority?: MaintenancePriority | '';
  dateFrom?: string;
  dateTo?: string;
}

export interface MaintenanceKpiSummary {
  openCount: number;
  overdueCount: number;
  waitingMaterialCount: number;
  waitingMaterialStuckCount: number;
  completedThisMonth: number;
  completedTrendPct: number;
  totalThisMonth: number;
  totalTrendPct: number;
}

export type MaintenanceStatusCounts = Record<'ALL' | MaintenanceStatus, number>;
