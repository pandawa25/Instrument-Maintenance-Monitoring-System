import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPmActivityType,
  deletePmActivityType,
  fetchPmActivityTypes,
  fetchPmActivityTypesForDropdown,
  updatePmActivityType,
} from '../api/pm-activity-types.api';
import type { PmActivityTypeFormValues, PmActivityTypeQueryParams } from '../types/pm-activity-type.types';

const PM_ACTIVITY_TYPES_KEY = 'pm-activity-types';

export function usePmActivityTypeList(params: PmActivityTypeQueryParams) {
  return useQuery({
    queryKey: [PM_ACTIVITY_TYPES_KEY, 'list', params],
    queryFn: () => fetchPmActivityTypes(params),
    placeholderData: (prev) => prev,
  });
}

export function usePmActivityTypesLookup() {
  return useQuery({
    queryKey: [PM_ACTIVITY_TYPES_KEY, 'dropdown'],
    queryFn: fetchPmActivityTypesForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePmActivityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PmActivityTypeFormValues) => createPmActivityType(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PM_ACTIVITY_TYPES_KEY] }),
  });
}

export function useUpdatePmActivityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PmActivityTypeFormValues> }) =>
      updatePmActivityType(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PM_ACTIVITY_TYPES_KEY] }),
  });
}

export function useDeletePmActivityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePmActivityType(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PM_ACTIVITY_TYPES_KEY] }),
  });
}
