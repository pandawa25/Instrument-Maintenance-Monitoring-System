import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { PermissionModule } from '@/types/permissions';

// Halaman-halaman dashboard hanya bisa diakses jika sudah login.
export function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Beberapa halaman (User Management, pengaturan Role & Permission) SELALU
// Admin only — tidak ikut diatur lewat matriks (lihat PermissionsService di
// backend: mencegah Admin mengunci diri sendiri keluar sistem).
export function RequireRole({ roles }: { roles: string[] }) {
  const role = useAuthStore((s) => s.user?.role);
  return role && roles.includes(role) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// Proteksi route berbasis matriks hak akses (role_permissions) — dipakai untuk
// semua modul operasional (Area, Equipment, Maintenance, PM, dst). Admin selalu
// lolos (bypass di backend sudah tercermin di map permission hasil /auth/me).
export function RequirePermission({ module }: { module: PermissionModule }) {
  const canView = useAuthStore((s) => s.user?.permissions?.[module]?.view ?? false);
  return canView ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
