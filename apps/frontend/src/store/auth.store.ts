import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'Admin' | 'Viewer' | string;
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
}

// SENGAJA TIDAK di-persist ke localStorage — access token JWT di localStorage
// bisa dibaca skrip apapun kalau ada celah XSS di app ini atau dependency-nya.
// Sesi lintas-reload ditangani oleh refresh token di httpOnly cookie (tidak
// bisa dibaca JavaScript sama sekali) + bootstrapAuth() yang menukarnya jadi
// access token baru saat app baru dimuat (lihat App.tsx & lib/axios.ts).
export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  setSession: (token, user) => set({ token, user, isAuthenticated: true }),
  setHydrated: (hydrated) => set({ isHydrated: hydrated }),
  logout: () => set({ token: null, user: null, isAuthenticated: false }),
}));
