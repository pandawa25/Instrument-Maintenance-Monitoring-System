export type SparePartStatus = 'ACTIVE' | 'INACTIVE';

export interface SparePart {
  id: string;
  kimap: string;
  name: string;
  unit: string;
  stock: number;
  status: SparePartStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SparePartFormValues {
  kimap: string;
  name: string;
  unit: string;
  stock: number | string;
  status: SparePartStatus;
  remarks?: string;
}

export interface SparePartQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: SparePartStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
