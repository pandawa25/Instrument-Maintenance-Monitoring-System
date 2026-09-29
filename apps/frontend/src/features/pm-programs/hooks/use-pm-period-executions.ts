import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPmPeriodExecutionById, updatePmPeriodExecution } from '../api/pm-period-executions.api';
import type { UpdatePmPeriodExecutionPayload } from '../types/pm-period.types';

const PM_EXECUTIONS_KEY = 'pm-period-executions';

export function usePmPeriodExecution(id: string | undefined) {
  return useQuery({
    queryKey: [PM_EXECUTIONS_KEY, 'detail', id],
    queryFn: () => fetchPmPeriodExecutionById(id!),
    enabled: Boolean(id),
  });
}

export function useUpdatePmPeriodExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePmPeriodExecutionPayload }) =>
      updatePmPeriodExecution(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PM_EXECUTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['pm-periods'] });
    },
  });
}
