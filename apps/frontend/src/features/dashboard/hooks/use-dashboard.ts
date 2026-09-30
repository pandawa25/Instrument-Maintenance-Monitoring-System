import { useQuery } from '@tanstack/react-query';
import { fetchDashboardCharts, fetchDashboardKpi, fetchDashboardRecent, fetchDashboardSummary } from '../api/dashboard.api';

// staleTime pendek — dashboard mestinya cukup up-to-date tiap dibuka, tapi tidak
// perlu refetch terus-menerus selagi dilihat.
const STALE_TIME = 60 * 1000;

export function useDashboardSummary() {
  return useQuery({ queryKey: ['dashboard', 'summary'], queryFn: fetchDashboardSummary, staleTime: STALE_TIME });
}

export function useDashboardCharts() {
  return useQuery({ queryKey: ['dashboard', 'charts'], queryFn: fetchDashboardCharts, staleTime: STALE_TIME });
}

export function useDashboardRecent() {
  return useQuery({ queryKey: ['dashboard', 'recent'], queryFn: fetchDashboardRecent, staleTime: STALE_TIME });
}

export function useDashboardKpi(months: number) {
  return useQuery({
    queryKey: ['dashboard', 'kpi', months],
    queryFn: () => fetchDashboardKpi(months),
    staleTime: STALE_TIME,
  });
}
