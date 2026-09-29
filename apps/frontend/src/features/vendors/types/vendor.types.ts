export type VendorStatus = 'ACTIVE' | 'INACTIVE';

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: VendorStatus;
  remarks: string | null;
  totalPmProgram: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorFormValues {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: VendorStatus;
  remarks?: string;
}

export interface VendorQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: VendorStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
