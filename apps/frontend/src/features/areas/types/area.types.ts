export type AreaStatus = 'ACTIVE' | 'INACTIVE';

export interface Area {
  id: string;
  areaCode: string;
  areaName: string;
  description: string | null;
  status: AreaStatus;
  totalEquipment: number;
  createdAt: string;
  updatedAt: string;
}

export interface AreaFormValues {
  areaCode: string;
  areaName: string;
  description?: string;
  status: AreaStatus;
}

export interface AreaQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: AreaStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
