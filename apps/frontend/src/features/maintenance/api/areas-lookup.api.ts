import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { AreaRef } from '../types/maintenance.types';

// Lookup ringan untuk filter Area di halaman Corrective Maintenance.
export async function fetchAreasForDropdown() {
  const { data } = await api.get<PaginatedResult<AreaRef & { status: string }>>('/areas', {
    params: { limit: 100, sortBy: 'areaName', sortOrder: 'asc', status: 'ACTIVE' },
  });
  return data.data;
}
