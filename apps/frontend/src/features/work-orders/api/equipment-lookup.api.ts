import { api } from '@/lib/axios';

export interface EquipmentRef {
  id: string;
  tagNumber: string;
  service: string;
  area: { areaCode: string };
}

// Lookup ringan untuk dropdown Equipment — dipakai LinkEquipmentDialog (relink manual WO
// yang belum terhubung). Duplikat kecil dari pola yang sama di feature maintenance
// (equipment-lookup.api.ts) — tiap feature folder sengaja self-contained, konsisten
// dengan konvensi module boundary di project ini.
export async function fetchEquipmentForDropdown() {
  const { data } = await api.get<{ data: EquipmentRef[] }>('/equipment/dropdown');
  return data.data;
}
