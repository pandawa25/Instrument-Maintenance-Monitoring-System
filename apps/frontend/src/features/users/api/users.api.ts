import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type {
  CreateUserFormValues,
  ManagedUser,
  UpdateUserFormValues,
  UserQueryParams,
} from '../types/user.types';

export async function fetchUsers(params: UserQueryParams) {
  const { data } = await api.get<PaginatedResult<ManagedUser>>('/users/admin', {
    params: { ...params, roleId: params.roleId || undefined, isActive: params.isActive || undefined },
  });
  return data;
}

export async function fetchUserById(id: string) {
  const { data } = await api.get<{ data: ManagedUser }>(`/users/admin/${id}`);
  return data.data;
}

export async function createUser(payload: CreateUserFormValues) {
  const { data } = await api.post<{ data: ManagedUser }>('/users/admin', payload);
  return data.data;
}

export async function updateUser(id: string, payload: Partial<UpdateUserFormValues>) {
  const { data } = await api.patch<{ data: ManagedUser }>(`/users/admin/${id}`, payload);
  return data.data;
}

export async function changeUserPassword(id: string, newPassword: string) {
  const { data } = await api.patch<{ data: { id: string; passwordChanged: boolean } }>(
    `/users/admin/${id}/password`,
    { newPassword },
  );
  return data.data;
}

export async function deleteUser(id: string) {
  await api.delete(`/users/admin/${id}`);
}
