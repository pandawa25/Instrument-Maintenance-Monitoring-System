export interface InstrumentName {
  id: string;
  code: string;
  name: string;
  description: string | null;
  totalEquipment: number;
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentNameFormValues {
  code: string;
  name: string;
  description?: string;
}

export interface InstrumentNameQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
