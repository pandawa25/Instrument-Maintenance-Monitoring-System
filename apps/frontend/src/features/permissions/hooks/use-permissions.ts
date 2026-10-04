import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PermissionModule } from '@/types/permissions';
import { fetchPermissionMatrix, updateRolePermission } from '../api/permissions.api';
import type { RolePermissionCell } from '../types/permission.types';

const PERMISSIONS_KEY = 'permission-matrix';

export function usePermissionMatrix() {
  return useQuery({
    queryKey: [PERMISSIONS_KEY],
    queryFn: fetchPermissionMatrix,
  });
}

export function useUpdateRolePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      module,
      payload,
    }: {
      roleId: string;
      module: PermissionModule;
      payload: Omit<RolePermissionCell, 'module'>;
    }) => updateRolePermission(roleId, module, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PERMISSIONS_KEY] }),
  });
}
