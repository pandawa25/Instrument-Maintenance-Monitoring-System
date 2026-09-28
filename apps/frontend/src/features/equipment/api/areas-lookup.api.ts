import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { AreaRef } from '../types/equipment.types';

// Lookup ringan untuk dropdown Area di form Equipment.
// Memakai endpoint /areas yang sama dengan Module Area, limit besar tanpa perlu pagination UI.
export async function fetchAreasForDropdown() {
  const { data } = await api.get<PaginatedResult<AreaRef & { status: string }>>('/areas', {
    params: { limit: 100, sortBy: 'areaName', sortOrder: 'asc', status: 'ACTIVE' },
  });
  return data.data;
}
