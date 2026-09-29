import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  PmProgramDetail,
  PmProgramFormValues,
  PmProgramListItem,
  PmProgramQueryParams,
} from '../types/pm-program.types';

export async function fetchPmPrograms(params: PmProgramQueryParams) {
  const { data } = await api.get<PaginatedResult<PmProgramListItem>>('/pm-programs', {
    params: { ...params, status: params.status || undefined, vendorId: params.vendorId || undefined },
  });
  return data;
}

export async function fetchPmProgramById(id: string) {
  const { data } = await api.get<{ data: PmProgramDetail }>(`/pm-programs/${id}`);
  return data.data;
}

export async function createPmProgram(payload: PmProgramFormValues) {
  const { data } = await api.post<{ data: PmProgramDetail }>('/pm-programs', payload);
  return data.data;
}

export async function updatePmProgram(id: string, payload: Partial<PmProgramFormValues>) {
  const { data } = await api.patch<{ data: PmProgramDetail }>(`/pm-programs/${id}`, payload);
  return data.data;
}

export async function deletePmProgram(id: string) {
  await api.delete(`/pm-programs/${id}`);
}
