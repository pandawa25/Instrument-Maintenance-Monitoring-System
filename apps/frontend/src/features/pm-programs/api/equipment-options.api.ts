import { api } from '@/lib/axios';

export interface EquipmentOption {
  id: string;
  tagNumber: string;
  service: string;
  area: { areaCode: string };
}

// Dipakai untuk checkbox multi-select equipment di form PM Program.
// Pakai endpoint dropdown khusus (bukan /equipment yang berpaginasi dengan limit
// maks 100) supaya semua equipment aktif selalu ikut termuat, berapa pun jumlahnya.
export async function fetchEquipmentOptions() {
  const { data } = await api.get<{ data: EquipmentOption[] }>('/equipment/dropdown');
  return data.data;
}
