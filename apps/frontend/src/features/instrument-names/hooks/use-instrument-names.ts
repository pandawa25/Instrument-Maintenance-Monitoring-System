import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createInstrumentName,
  deleteInstrumentName,
  fetchInstrumentNames,
  updateInstrumentName,
} from '../api/instrument-names.api';
import type { InstrumentNameFormValues, InstrumentNameQueryParams } from '../types/instrument-name.types';

const INSTRUMENT_NAMES_KEY = 'instrument-names-master';

export function useInstrumentNameList(params: InstrumentNameQueryParams) {
  return useQuery({
    queryKey: [INSTRUMENT_NAMES_KEY, params],
    queryFn: () => fetchInstrumentNames(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateInstrumentName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InstrumentNameFormValues) => createInstrumentName(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENT_NAMES_KEY] }),
  });
}

export function useUpdateInstrumentName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<InstrumentNameFormValues> }) =>
      updateInstrumentName(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENT_NAMES_KEY] }),
  });
}

export function useDeleteInstrumentName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInstrumentName(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENT_NAMES_KEY] }),
  });
}
