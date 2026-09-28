import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createInstrumentName,
  deleteInstrumentName,
  fetchInstrumentNames,
  updateInstrumentName,
} from '../api/instrument-names.api';
import type { InstrumentNameFormValues, InstrumentNameQueryParams } from '../types/instrument-name.types';

// Root key dibagi dengan dropdown lookup di feature Equipment
// (lihat features/equipment/hooks/use-equipment-lookups.ts, queryKey ['instrument-names', 'dropdown']).
// Ini SENGAJA disamakan: invalidateQueries({queryKey: [INSTRUMENT_NAMES_ROOT_KEY]}) mencocokkan
// berdasarkan prefix, jadi begitu master data Instrument Name diubah di sini, cache dropdown
// pada form Equipment ikut langsung ter-refresh — tidak menunggu staleTime 5 menit habis.
const INSTRUMENT_NAMES_ROOT_KEY = 'instrument-names';

export function useInstrumentNameList(params: InstrumentNameQueryParams) {
  return useQuery({
    queryKey: [INSTRUMENT_NAMES_ROOT_KEY, 'list', params],
    queryFn: () => fetchInstrumentNames(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateInstrumentName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InstrumentNameFormValues) => createInstrumentName(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENT_NAMES_ROOT_KEY] }),
  });
}

export function useUpdateInstrumentName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<InstrumentNameFormValues> }) =>
      updateInstrumentName(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENT_NAMES_ROOT_KEY] }),
  });
}

export function useDeleteInstrumentName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInstrumentName(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INSTRUMENT_NAMES_ROOT_KEY] }),
  });
}
