import { useQuery } from '@tanstack/react-query';
import { fetchEquipmentHistory, fetchTopEquipment, searchHistoryEquipment } from '../api/maintenance-history.api';
import type { HistoryFilters } from '../types/maintenance-history.types';

const KEY = 'maintenance-history';

/** Pencarian equipment — baru jalan setelah ada kata kunci (halaman awal tidak memuat daftar apa pun). */
export function useHistoryEquipmentSearch(search: string) {
  const term = search.trim();
  return useQuery({
    queryKey: [KEY, 'search', term],
    queryFn: () => searchHistoryEquipment(term),
    enabled: term.length > 0,
    placeholderData: (prev) => prev,
  });
}

export function useEquipmentHistory(equipmentId: string | null, filters: HistoryFilters) {
  return useQuery({
    queryKey: [KEY, 'equipment', equipmentId, filters],
    queryFn: () => fetchEquipmentHistory(equipmentId as string, filters),
    enabled: Boolean(equipmentId),
    placeholderData: (prev) => prev,
  });
}

/** 10 equipment dengan maintenance terbanyak — isi awal halaman supaya tidak kosong. */
export function useTopMaintenanceEquipment(limit = 10) {
  return useQuery({
    queryKey: [KEY, 'top', limit],
    queryFn: () => fetchTopEquipment(limit),
    staleTime: 60_000,
  });
}
