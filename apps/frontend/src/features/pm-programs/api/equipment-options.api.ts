import { api } from '@/lib/axios';

export interface EquipmentOption {
  id: string;
  tagNumber: string;
  service: string;
  area: { areaCode: string };
}

// Dipakai untuk checkbox multi-select equipment di form PM Program.
// Endpoint /equipment memang untuk list berpaginasi, jadi di sini kita minta
// limit besar sekali panggilan saja (jumlah equipment realistis masih kecil untuk MVP).
export async function fetchEquipmentOptions() {
  const { data } = await api.get<{ data: EquipmentOption[] }>('/equipment', {
    params: { page: 1, limit: 1000, sortBy: 'tagNumber', sortOrder: 'asc' },
  });
  return data.data;
}
