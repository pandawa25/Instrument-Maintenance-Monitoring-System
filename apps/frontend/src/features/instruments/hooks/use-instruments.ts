import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createInstrument,
  deleteInstrument,
  fetchInstruments,
  updateInstrument,
} from '../api/instruments.api';
import type { InstrumentFormValues, InstrumentQueryParams } from '../types/instrument.types';

const INSTRUMENTS_KEY = 'instruments';

export function useInstruments(params: InstrumentQueryParams) {
  return useQuery({
    queryKey: [INSTRUMENTS_KEY, params],
    queryFn: () => fetchInstruments(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InstrumentFormValues) => createInstrument(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENTS_KEY] }),
  });
}

export function useUpdateInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<InstrumentFormValues> }) =>
      updateInstrument(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENTS_KEY] }),
  });
}

export function useDeleteInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInstrument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENTS_KEY] }),
  });
}
