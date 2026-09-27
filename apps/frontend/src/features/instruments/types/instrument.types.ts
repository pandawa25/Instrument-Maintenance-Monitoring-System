export type InstrumentStatus = 'ACTIVE' | 'STANDBY' | 'OUT_OF_SERVICE';
export type Criticality = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InstrumentTypeRef {
  id: string;
  typeCode: string;
  typeName: string;
}

export interface AreaRef {
  id: string;
  areaCode: string;
  areaName: string;
}

export interface Instrument {
  id: string;
  tagNumber: string;
  instrumentName: string;
  description: string | null;
  area: AreaRef;
  instrumentType: InstrumentTypeRef;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installationDate: string | null;
  status: InstrumentStatus;
  criticality: Criticality;
  remarks: string | null;
  lastMaintenanceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentFormValues {
  tagNumber: string;
  instrumentName: string;
  description?: string;
  areaId: string;
  instrumentTypeId: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  status: InstrumentStatus;
  criticality: Criticality;
  remarks?: string;
}

export interface InstrumentQueryParams {
  page: number;
  limit: number;
  search?: string;
  areaId?: string | '';
  instrumentTypeId?: string | '';
  status?: InstrumentStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
