import { api } from '@/lib/axios';
import type { PmPeriodExecutionItem, UpdatePmPeriodExecutionPayload } from '../types/pm-period.types';

export async function fetchPmPeriodExecutionById(id: string) {
  const { data } = await api.get<{ data: PmPeriodExecutionItem }>(`/pm-period-executions/${id}`);
  return data.data;
}

export async function updatePmPeriodExecution(id: string, payload: UpdatePmPeriodExecutionPayload) {
  const { data } = await api.patch<{ data: PmPeriodExecutionItem }>(`/pm-period-executions/${id}`, payload);
  return data.data;
}
