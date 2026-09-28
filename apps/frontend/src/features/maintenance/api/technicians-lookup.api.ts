import { api } from '@/lib/axios';
import type { TechnicianRef } from '../types/maintenance.types';

// Lookup ringan untuk dropdown Technician — endpoint GET /users (read-only, semua role login bisa akses).
export async function fetchTechniciansForDropdown() {
  const { data } = await api.get<{ data: TechnicianRef[] }>('/users');
  return data.data;
}
