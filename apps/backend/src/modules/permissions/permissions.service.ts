import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PermissionAction } from './permission.types';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

const ACTION_FIELD: Record<PermissionAction, 'canView' | 'canCreate' | 'canEdit' | 'canDelete'> = {
  view: 'canView',
  create: 'canCreate',
  edit: 'canEdit',
  delete: 'canDelete',
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Role "Admin" SELALU bypass matriks — hardcoded di sini, BUKAN lewat baris
   * role_permissions — supaya Admin tidak pernah bisa mengunci diri sendiri
   * keluar sistem gara-gara salah konfigurasi matriks. Role lain dicek LIVE ke
   * DB (bukan dari klaim di JWT) supaya perubahan matriks oleh Admin langsung
   * berlaku ke semua user role tsb yang sedang login, tanpa perlu re-login.
   */
  async hasPermission(user: AuthenticatedUser, module: PermissionModule, action: PermissionAction): Promise<boolean> {
    if (user.role === 'Admin') {
      return true;
    }

    const permission = await this.prisma.rolePermission.findUnique({
      where: { roleId_module: { roleId: user.roleId, module } },
    });

    // Tidak ada baris sama sekali = modul tersembunyi total untuk role ini (default aman).
    if (!permission) {
      return false;
    }

    return permission[ACTION_FIELD[action]];
  }

  /**
   * Ambil seluruh matriks (semua role SELAIN Admin x semua module) untuk halaman
   * pengaturan. Admin tidak dimasukkan karena hak aksesnya selalu full & tidak
   * bisa diubah (lihat hasPermission di atas) — menampilkannya hanya akan
   * membingungkan Admin yang mengatur matriks.
   */
  async getMatrix() {
    const roles = await this.prisma.role.findMany({
      where: { deletedAt: null, name: { not: 'Admin' } },
      orderBy: { name: 'asc' },
      include: { permissions: true },
    });

    return roles.map((role) => ({
      roleId: role.id,
      roleName: role.name,
      roleDescription: role.description,
      permissions: Object.values(PermissionModule).map((module) => {
        const existing = role.permissions.find((p) => p.module === module);
        return {
          module,
          canView: existing?.canView ?? false,
          canCreate: existing?.canCreate ?? false,
          canEdit: existing?.canEdit ?? false,
          canDelete: existing?.canDelete ?? false,
        };
      }),
    }));
  }

  /**
   * Map permission user yang sedang login, untuk dikonsumsi frontend (GET /auth/me)
   * supaya sidebar/tombol aksi bisa disembunyikan/dimunculkan sesuai hak akses live,
   * tanpa frontend perlu hardcode cek role === 'Admin' per modul.
   */
  async getMyPermissions(user: AuthenticatedUser): Promise<Record<PermissionModule, Record<PermissionAction, boolean>>> {
    const isAdmin = user.role === 'Admin';
    const rows = isAdmin
      ? []
      : await this.prisma.rolePermission.findMany({ where: { roleId: user.roleId } });

    const result = {} as Record<PermissionModule, Record<PermissionAction, boolean>>;
    for (const module of Object.values(PermissionModule)) {
      const row = rows.find((r) => r.module === module);
      result[module] = {
        view: isAdmin || (row?.canView ?? false),
        create: isAdmin || (row?.canCreate ?? false),
        edit: isAdmin || (row?.canEdit ?? false),
        delete: isAdmin || (row?.canDelete ?? false),
      };
    }
    return result;
  }

  /** Upsert satu baris matriks (role x module) — dipanggil dari halaman pengaturan Admin. */
  async upsert(roleId: string, module: PermissionModule, dto: UpdateRolePermissionDto) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, deletedAt: null } });
    if (!role) {
      throw new NotFoundException('Role tidak ditemukan');
    }
    if (role.name === 'Admin') {
      throw new ForbiddenException('Hak akses role Admin tidak dapat diubah — selalu full access ke seluruh sistem');
    }

    return this.prisma.rolePermission.upsert({
      where: { roleId_module: { roleId, module } },
      update: dto,
      create: { roleId, module, ...dto },
    });
  }
}
