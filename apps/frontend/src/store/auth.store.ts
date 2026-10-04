import { create } from 'zustand';
import type { PermissionAction, PermissionModule, PermissionsMap } from '@/types/permissions';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'Admin' | 'Teknisi' | 'View' | 'Vendor' | string;
  roleId: string;
  // Map hasil GET /auth/me — dihitung live di backend (Admin selalu full true,
  // role lain dari tabel role_permissions). Dipakai hasPermission() di bawah
  // supaya UI tidak perlu hardcode cek role === 'Admin' per modul.
  permissions: PermissionsMap;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  // true setelah percobaan bootstrap (lihat bootstrapAuth() di lib/axios.ts)
  // selesai — dipakai App.tsx untuk menahan render route sampai kita tahu
  // pasti status login, supaya RequireAuth tidak sempat redirect ke /login
  // duluan sebelum refresh-token cookie sempat dicoba.
  isHydrated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  setHydrated: (hydrated: boolean) => void;
  logout: () => void;
  // true kalau user yang sedang login boleh melakukan `action` di `module`.
  // Tidak login / belum ada data permission (mis. sesaat sebelum /auth/me
  // selesai) dianggap TIDAK boleh — fail-closed, bukan fail-open.
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
}

// SENGAJA TIDAK di-persist ke localStorage — access token JWT di localStorage
// bisa dibaca skrip apapun kalau ada celah XSS di app ini atau dependency-nya.
// Sesi lintas-reload ditangani oleh refresh token di httpOnly cookie (tidak
// bisa dibaca JavaScript sama sekali) + bootstrapAuth() yang menukarnya jadi
// access token baru saat app baru dimuat (lihat App.tsx & lib/axios.ts).
export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  setSession: (token, user) => set({ token, user, isAuthenticated: true }),
  setHydrated: (hydrated) => set({ isHydrated: hydrated }),
  logout: () => set({ token: null, user: null, isAuthenticated: false }),
  hasPermission: (module, action) => {
    const user = get().user;
    if (!user) return false;
    return user.permissions?.[module]?.[action] ?? false;
  },
}));

/** Hook pendek untuk dipakai langsung di komponen: const canEdit = usePermission('AREA', 'edit'); */
export function usePermission(module: PermissionModule, action: PermissionAction): boolean {
  return useAuthStore((s) => s.user?.permissions?.[module]?.[action] ?? false);
}
