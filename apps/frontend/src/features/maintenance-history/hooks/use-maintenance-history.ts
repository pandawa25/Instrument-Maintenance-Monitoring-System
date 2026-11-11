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

/**
 * 10 equipment dengan maintenance terbanyak (Corrective dan Preventive dirangking terpisah) —
 * isi awal halaman supaya tidak kosong. Default rentang data: 6 bulan terakhir.
 */
export function useTopMaintenanceEquipment(limit = 10, months = 6) {
  return useQuery({
    queryKey: [KEY, 'top', limit, months],
    queryFn: () => fetchTopEquipment(limit, months),
    staleTime: 60_000,
  });
}
