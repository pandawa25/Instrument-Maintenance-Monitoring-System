export type EquipmentStatus = 'ACTIVE' | 'STANDBY' | 'OUT_OF_SERVICE';
export type Criticality = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InstrumentNameRef {
  id: string;
  code: string;
  name: string;
}

export interface AreaRef {
  id: string;
  areaCode: string;
  areaName: string;
}

export interface Equipment {
  id: string;
  tagNumber: string;
  service: string;
  description: string | null;
  area: AreaRef;
  instrumentName: InstrumentNameRef;
  type: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installationDate: string | null;
  status: EquipmentStatus;
  criticality: Criticality;
  remarks: string | null;
  lastMaintenanceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentFormValues {
  tagNumber: string;
  service: string;
  description?: string;
  areaId: string;
  instrumentNameId: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  status: EquipmentStatus;
  criticality: Criticality;
  remarks?: string;
}

export interface EquipmentQueryParams {
  page: number;
  limit: number;
  search?: string;
  areaId?: string | '';
  instrumentNameId?: string | '';
  status?: EquipmentStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
