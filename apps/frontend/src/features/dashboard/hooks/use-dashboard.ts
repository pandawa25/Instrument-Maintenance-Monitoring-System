import { useQueries, useQuery } from '@tanstack/react-query';
import {
  fetchDashboardCharts,
  fetchDashboardHealthIndex,
  fetchDashboardKpi,
  fetchDashboardRecent,
  fetchDashboardSummary,
  fetchDashboardTrend,
} from '../api/dashboard.api';
import type { TrendMetric } from '../types/dashboard.types';

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

export function useDashboardHealthIndex(months: number) {
  return useQuery({
    queryKey: ['dashboard', 'health-index', months],
    queryFn: () => fetchDashboardHealthIndex(months),
    staleTime: STALE_TIME,
  });
}

// Dipakai saat 1 kotak summary clickable diklik — ganti metric yang digambar di
// "Grafik Performa" tanpa fetch ulang seluruh kotak lain pada tab yang sama.
export function useDashboardTrend(metric: TrendMetric, from: string, to: string) {
  return useQuery({
    queryKey: ['dashboard', 'trend', metric, from, to],
    queryFn: () => fetchDashboardTrend(metric, from, to),
    staleTime: STALE_TIME,
  });
}

// Dipakai untuk mengisi angka di tiap kotak summary clickable sekaligus (1 tab = N
// metric) — tiap kotak tetap query terpisah (cache per metric kepakai ulang saat
// metric itu diklik jadi aktif) tapi di-trigger bareng lewat useQueries.
export function useDashboardTrendBatch(metrics: TrendMetric[], from: string, to: string) {
  return useQueries({
    queries: metrics.map((metric) => ({
      queryKey: ['dashboard', 'trend', metric, from, to],
      queryFn: () => fetchDashboardTrend(metric, from, to),
      staleTime: STALE_TIME,
    })),
  });
}
