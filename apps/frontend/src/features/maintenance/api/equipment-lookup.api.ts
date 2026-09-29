import { api } from '@/lib/axios';
import type { EquipmentRef } from '../types/maintenance.types';

// Lookup ringan untuk dropdown Equipment di form Corrective Maintenance.
// Pakai endpoint dropdown khusus (bukan /equipment yang berpaginasi dengan limit
// maks 100) supaya semua equipment aktif ikut termuat, berapa pun jumlahnya.
export async function fetchEquipmentForDropdown() {
  const { data } = await api.get<{ data: EquipmentRef[] }>('/equipment/dropdown');
  return data.data;
}
