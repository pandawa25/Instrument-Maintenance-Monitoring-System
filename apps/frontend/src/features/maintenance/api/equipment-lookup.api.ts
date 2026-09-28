import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { EquipmentRef } from '../types/maintenance.types';

// Lookup ringan untuk dropdown Equipment di form Corrective Maintenance.
export async function fetchEquipmentForDropdown() {
  const { data } = await api.get<PaginatedResult<EquipmentRef & { tagNumber: string }>>('/equipment', {
    params: { limit: 100, sortBy: 'tagNumber', sortOrder: 'asc' },
  });
  return data.data;
}
