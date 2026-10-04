import { api } from '@/lib/axios';
import type { PermissionModule } from '@/types/permissions';
import type { RolePermissionCell, RolePermissionMatrixRow } from '../types/permission.types';

export async function fetchPermissionMatrix() {
  const { data } = await api.get<{ data: RolePermissionMatrixRow[] }>('/permissions/matrix');
  return data.data;
}

export async function updateRolePermission(
  roleId: string,
  module: PermissionModule,
  payload: Omit<RolePermissionCell, 'module'>,
) {
  const { data } = await api.put<{ data: RolePermissionCell }>(`/permissions/${roleId}/${module}`, payload);
  return data.data;
}
