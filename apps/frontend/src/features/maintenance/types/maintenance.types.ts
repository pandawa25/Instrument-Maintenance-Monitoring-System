export type FailureCategory =
  | 'INSTRUMENT'
  | 'ELECTRICAL'
  | 'MECHANICAL'
  | 'COMMUNICATION'
  | 'CONFIGURATION'
  | 'CALIBRATION'
  | 'PROCESS';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

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
  maintenanceDate: string;
  equipment: EquipmentRef;
  area: AreaRef;
  failureCategory: FailureCategory;
  problemDescription: string;
  rootCause: string | null;
  actionTaken: string | null;
  downtimeHours: string | number | null;
  technician: TechnicianRef;
  status: MaintenanceStatus;
  completionDate: string | null;
  createdBy: TechnicianRef;
  remarks: string | null;
  needsSparePart: boolean;
  materials: MaintenanceMaterial[];
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
  status: MaintenanceStatus;
  completionDate?: string;
  remarks?: string;
  needsSparePart: boolean;
  materials: MaterialFormItem[];
}

export interface MaintenanceQueryParams {
  page: number;
  limit: number;
  search?: string;
  areaId?: string | '';
  equipmentId?: string | '';
  status?: MaintenanceStatus | '';
  dateFrom?: string;
  dateTo?: string;
}
