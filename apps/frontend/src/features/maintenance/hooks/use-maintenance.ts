import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createMaintenance,
  deleteMaintenance,
  fetchMaintenance,
  fetchMaintenanceById,
  fetchMaintenanceKpiSummary,
  fetchMaintenanceStatusCounts,
  updateMaintenance,
} from '../api/maintenance.api';
import type { MaintenanceFormValues, MaintenanceQueryParams } from '../types/maintenance.types';

const MAINTENANCE_KEY = 'maintenance';

export function useMaintenanceList(params: MaintenanceQueryParams) {
  return useQuery({
    queryKey: [MAINTENANCE_KEY, params],
    queryFn: () => fetchMaintenance(params),
    placeholderData: (prev) => prev,
  });
}

// Dipakai MaintenanceDetailPage (halaman View/Edit) — bukan oleh list page.
export function useMaintenanceById(id: string | undefined) {
  return useQuery({
    queryKey: [MAINTENANCE_KEY, id],
    queryFn: () => fetchMaintenanceById(id as string),
    enabled: Boolean(id),
  });
}

/** 4 KPI card teratas — global, tidak terpengaruh filter tabel. */
export function useMaintenanceKpiSummary() {
  return useQuery({
    queryKey: [MAINTENANCE_KEY, 'kpi-summary'],
    queryFn: fetchMaintenanceKpiSummary,
  });
}

/** Count per status untuk badge tab — ikut filter search/area/date range (bukan status). */
export function useMaintenanceStatusCounts(params: MaintenanceQueryParams) {
  return useQuery({
    queryKey: [MAINTENANCE_KEY, 'status-counts', params],
    queryFn: () => fetchMaintenanceStatusCounts(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceFormValues) => createMaintenance(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MAINTENANCE_KEY] }),
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MaintenanceFormValues> }) =>
      updateMaintenance(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MAINTENANCE_KEY] }),
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMaintenance(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MAINTENANCE_KEY] }),
  });
}
