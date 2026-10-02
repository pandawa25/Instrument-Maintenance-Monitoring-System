import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  Maintenance,
  MaintenanceFormValues,
  MaintenanceKpiSummary,
  MaintenanceQueryParams,
  MaintenanceStatusCounts,
} from '../types/maintenance.types';

function cleanParams(params: MaintenanceQueryParams) {
  return {
    ...params,
    areaId: params.areaId || undefined,
    equipmentId: params.equipmentId || undefined,
    status: params.status || undefined,
    priority: params.priority || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };
}

export async function fetchMaintenance(params: MaintenanceQueryParams) {
  const { data } = await api.get<PaginatedResult<Maintenance>>('/maintenance', { params: cleanParams(params) });
  return data;
}

export async function fetchMaintenanceKpiSummary() {
  const { data } = await api.get<{ data: MaintenanceKpiSummary }>('/maintenance/dashboard/summary');
  return data.data;
}

export async function fetchMaintenanceStatusCounts(params: MaintenanceQueryParams) {
  const { data } = await api.get<{ data: MaintenanceStatusCounts }>('/maintenance/dashboard/status-counts', {
    params: cleanParams(params),
  });
  return data.data;
}

export async function exportMaintenance(params: MaintenanceQueryParams) {
  const response = await api.get('/maintenance/export', { params: cleanParams(params), responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `corrective-maintenance-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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
