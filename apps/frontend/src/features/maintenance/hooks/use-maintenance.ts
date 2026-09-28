import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createMaintenance,
  deleteMaintenance,
  fetchMaintenance,
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
