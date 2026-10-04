import { SetMetadata } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import { PermissionAction } from '../../modules/permissions/permission.types';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  module: PermissionModule;
  action: PermissionAction;
}

/**
 * Pakai di controller: @RequirePermission(PermissionModule.AREA, 'edit')
 * Dicek live ke tabel role_permissions lewat PermissionGuard (lihat guard untuk
 * detail bypass Admin). Beda dengan @Roles(...), yang mengecek nama role
 * langsung — dipakai khusus untuk modul yang TIDAK ikut matriks (User/Role/
 * Permission management, selalu Admin only, supaya Admin tidak bisa mengunci
 * diri sendiri keluar sistem lewat salah konfigurasi matriks).
 */
export const RequirePermission = (module: PermissionModule, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { module, action } satisfies RequiredPermission);
