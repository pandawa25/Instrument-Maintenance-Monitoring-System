import type { PermissionModule } from '@/types/permissions';

export interface RolePermissionCell {
  module: PermissionModule;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RolePermissionMatrixRow {
  roleId: string;
  roleName: string;
  roleDescription: string | null;
  permissions: RolePermissionCell[];
}

export type PermissionFlag = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';
