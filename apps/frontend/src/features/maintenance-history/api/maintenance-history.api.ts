import { api } from '@/lib/axios';
import type { EquipmentHistory, HistoryEquipmentOption, HistoryFilters } from '../types/maintenance-history.types';

export async function searchHistoryEquipment(search: string, limit = 20) {
  const { data } = await api.get<{ data: HistoryEquipmentOption[] }>('/maintenance-history/equipment-search', {
    params: { search, limit },
  });
  return data.data;
}

export async function fetchEquipmentHistory(equipmentId: string, filters: HistoryFilters) {
  const { data } = await api.get<{ data: EquipmentHistory }>(`/maintenance-history/equipment/${equipmentId}`, {
    params: {
      type: filters.type,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    },
  });
  return data.data;
}
