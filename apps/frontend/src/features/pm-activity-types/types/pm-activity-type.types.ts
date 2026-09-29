export interface PmActivityType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  totalChecklistItem: number;
  createdAt: string;
  updatedAt: string;
}

export interface PmActivityTypeFormValues {
  code: string;
  name: string;
  description?: string;
}

export interface PmActivityTypeQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
