export type FailureCategory =
  | 'INSTRUMENT'
  | 'ELECTRICAL'
  | 'MECHANICAL'
  | 'COMMUNICATION'
  | 'CONFIGURATION'
  | 'CALIBRATION'
  | 'PROCESS';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export interface InstrumentRef {
  id: string;
  tagNumber: string;
  instrumentName: string;
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

export interface Maintenance {
  id: string;
  maintenanceDate: string;
  instrument: InstrumentRef;
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
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceFormValues {
  maintenanceDate: string;
  instrumentId: string;
  failureCategory: FailureCategory;
  problemDescription: string;
  rootCause?: string;
  actionTaken?: string;
  downtimeHours?: number | string;
  technicianId: string;
  status: MaintenanceStatus;
  completionDate?: string;
  remarks?: string;
}

export interface MaintenanceQueryParams {
  page: number;
  limit: number;
  search?: string;
  areaId?: string | '';
  instrumentId?: string | '';
  status?: MaintenanceStatus | '';
  dateFrom?: string;
  dateTo?: string;
}
