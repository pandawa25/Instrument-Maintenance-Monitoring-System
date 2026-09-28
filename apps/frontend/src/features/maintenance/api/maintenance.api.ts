import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { Maintenance, MaintenanceFormValues, MaintenanceQueryParams } from '../types/maintenance.types';

export async function fetchMaintenance(params: MaintenanceQueryParams) {
  const { data } = await api.get<PaginatedResult<Maintenance>>('/maintenance', {
    params: {
      ...params,
      areaId: params.areaId || undefined,
      instrumentId: params.instrumentId || undefined,
      status: params.status || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
    },
  });
  return data;
}

export async function fetchMaintenanceById(id: string) {
  const { data } = await api.get<{ data: Maintenance }>(`/maintenance/${id}`);
  return data.data;
}

export async function createMaintenance(payload: MaintenanceFormValues) {
  const { data } = await api.post<{ data: Maintenance }>('/maintenance', payload);
  return data.data;
}

export async function updateMaintenance(id: string, payload: Partial<MaintenanceFormValues>) {
  const { data } = await api.patch<{ data: Maintenance }>(`/maintenance/${id}`, payload);
  return data.data;
}

export async function deleteMaintenance(id: string) {
  await api.delete(`/maintenance/${id}`);
}
