/**
 * 4 aksi CRUD yang dipetakan ke kolom boolean di tabel role_permissions
 * (canView/canCreate/canEdit/canDelete). Dashboard dkk yang tidak punya
 * aksi mutasi cukup pakai 'view'.
 */
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
