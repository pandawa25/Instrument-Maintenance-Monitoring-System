import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPmProgram,
  deletePmProgram,
  fetchPmProgramById,
  fetchPmPrograms,
  updatePmProgram,
} from '../api/pm-programs.api';
import type { PmProgramFormValues, PmProgramQueryParams } from '../types/pm-program.types';

const PM_PROGRAMS_KEY = 'pm-programs';

export function usePmProgramList(params: PmProgramQueryParams) {
  return useQuery({
    queryKey: [PM_PROGRAMS_KEY, 'list', params],
    queryFn: () => fetchPmPrograms(params),
    placeholderData: (prev) => prev,
  });
}

export function usePmProgramDetail(id: string | undefined) {
  return useQuery({
    queryKey: [PM_PROGRAMS_KEY, 'detail', id],
    queryFn: () => fetchPmProgramById(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePmProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PmProgramFormValues) => createPmProgram(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PM_PROGRAMS_KEY] }),
  });
}

export function useUpdatePmProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PmProgramFormValues> }) =>
      updatePmProgram(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PM_PROGRAMS_KEY] }),
  });
}

export function useDeletePmProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePmProgram(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PM_PROGRAMS_KEY] }),
  });
}
