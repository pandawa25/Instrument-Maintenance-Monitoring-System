import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Pakai di controller: @Roles('Admin')
 * Nama role harus sama persis dengan kolom `roles.name` di database.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
