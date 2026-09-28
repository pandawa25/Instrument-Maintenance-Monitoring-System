import { api } from '@/lib/axios';
import type { RoleRef } from '../types/user.types';

export async function fetchRolesForDropdown() {
  const { data } = await api.get<{ data: RoleRef[] }>('/roles');
  return data.data;
}
