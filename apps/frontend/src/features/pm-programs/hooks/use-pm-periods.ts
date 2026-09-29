import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPmPeriod,
  deletePmPeriod,
  fetchPmPeriodById,
  fetchPmPeriods,
  updatePmPeriod,
} from '../api/pm-periods.api';
import type { CreatePmPeriodPayload } from '../types/pm-period.types';

const PM_PERIODS_KEY = 'pm-periods';

export function usePmPeriods(programId: string | undefined) {
  return useQuery({
    queryKey: [PM_PERIODS_KEY, 'list', programId],
    queryFn: () => fetchPmPeriods(programId!),
    enabled: Boolean(programId),
  });
}

export function usePmPeriodDetail(id: string | undefined) {
  return useQuery({
    queryKey: [PM_PERIODS_KEY, 'detail', id],
    queryFn: () => fetchPmPeriodById(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePmPeriod(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePmPeriodPayload) => createPmPeriod(programId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PM_PERIODS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['pm-programs', 'detail', programId] });
      queryClient.invalidateQueries({ queryKey: ['pm-programs', 'list'] });
    },
  });
}

export function useUpdatePmPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePmPeriodPayload> }) => updatePmPeriod(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PM_PERIODS_KEY] }),
  });
}

export function useDeletePmPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePmPeriod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PM_PERIODS_KEY] }),
  });
}
