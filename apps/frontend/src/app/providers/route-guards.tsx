import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

// Halaman-halaman dashboard hanya bisa diakses jika sudah login.
export function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Beberapa halaman (mis. User Management) hanya untuk role tertentu.
export function RequireRole({ roles }: { roles: string[] }) {
  const role = useAuthStore((s) => s.user?.role);
  return role && roles.includes(role) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
