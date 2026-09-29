export type PmFrequencyUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type PmProgramStatus = 'ACTIVE' | 'INACTIVE';

export interface PmProgramVendorRef {
  id: string;
  name: string;
}

export interface PmProgramEquipmentRef {
  id: string;
  tagNumber: string;
  service: string;
  areaCode: string;
}

export interface PmProgramActivityTypeRef {
  id: string;
  code: string;
  name: string;
}

export interface PmProgramChecklistItem {
  id: string;
  activityType: PmProgramActivityTypeRef;
  description: string | null;
  sortOrder: number;
}

export interface PmProgramListItem {
  id: string;
  name: string;
  frequencyValue: number;
  frequencyUnit: PmFrequencyUnit;
  vendor: PmProgramVendorRef;
  startDate: string;
  status: PmProgramStatus;
  remarks: string | null;
  totalEquipment: number;
  totalPeriod: number;
  createdAt: string;
  updatedAt: string;
}

export interface PmProgramDetail {
  id: string;
  name: string;
  frequencyValue: number;
  frequencyUnit: PmFrequencyUnit;
  vendor: PmProgramVendorRef;
  startDate: string;
  status: PmProgramStatus;
  remarks: string | null;
  totalPeriod: number;
  equipment: PmProgramEquipmentRef[];
  checklistItems: PmProgramChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PmChecklistItemFormValue {
  activityTypeId: string;
  description?: string;
  sortOrder?: number;
}

export interface PmProgramFormValues {
  name: string;
  frequencyValue: number;
  frequencyUnit: PmFrequencyUnit;
  vendorId: string;
  startDate: string;
  status: PmProgramStatus;
  remarks?: string;
  equipmentIds: string[];
  checklistItems: PmChecklistItemFormValue[];
}

export interface PmProgramQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: PmProgramStatus | '';
  vendorId?: string | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
