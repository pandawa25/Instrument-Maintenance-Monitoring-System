import { api } from '@/lib/axios';
import type { DashboardCharts, DashboardKpi, DashboardRecent, DashboardSummary } from '../types/dashboard.types';

// Endpoint ini mengembalikan objek biasa (bukan array), tapi tetap dibungkus
// {data: ...} oleh ResponseTransformInterceptor backend — jadi tetap perlu
// di-unwrap seperti endpoint dropdown lainnya (lihat catatan di vendors.api.ts).
export async function fetchDashboardSummary() {
  const { data } = await api.get<{ data: DashboardSummary }>('/dashboard/summary');
  return data.data;
}

export async function fetchDashboardCharts() {
  const { data } = await api.get<{ data: DashboardCharts }>('/dashboard/charts');
  return data.data;
}

export async function fetchDashboardRecent() {
  const { data } = await api.get<{ data: DashboardRecent }>('/dashboard/recent');
  return data.data;
}

export async function fetchDashboardKpi(months: number) {
  const { data } = await api.get<{ data: DashboardKpi }>('/dashboard/kpi', { params: { months } });
  return data.data;
}
