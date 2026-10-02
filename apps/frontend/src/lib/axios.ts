import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

// withCredentials WAJIB — refresh token dikirim backend lewat httpOnly cookie
// (imports/auth.service.ts), browser hanya mengirim cookie cross-origin kalau
// flag ini diset di kedua sisi (backend: cors credentials:true).
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Instance polos tanpa interceptor — khusus panggil /auth/refresh, supaya
// tidak memicu ulang interceptor response di bawah (hindari infinite loop
// kalau refresh sendiri gagal dengan 401).
const refreshClient = axios.create({ baseURL, withCredentials: true });

// Endpoint yang TIDAK boleh memicu percobaan refresh otomatis saat 401 —
// 401 di endpoint ini berarti kredensial/sesi memang invalid dari awal,
// bukan access token yang sekadar kedaluwarsa.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

function isNoRefreshPath(url?: string): boolean {
  if (!url) return false;
  return NO_REFRESH_PATHS.some((path) => url.startsWith(path));
}

// Sisipkan JWT ke setiap request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Satu promise refresh dibagi ke semua request 401 yang terjadi bersamaan,
// supaya tidak ada beberapa panggilan /auth/refresh paralel yang masing-masing
// merotasi (dan saling membatalkan) refresh token yang sama.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then(({ data }) => {
        const { accessToken, user } = data.data;
        useAuthStore.getState().setSession(accessToken, user);
        return accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// 401 (access token kedaluwarsa) -> coba tukar lewat refresh token cookie,
// lalu ulangi request asli sekali. Kalau refresh juga gagal (cookie tidak
// ada/kedaluwarsa/dicabut) -> baru logout paksa & redirect ke /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Tidak ada response sama sekali (server down/koneksi putus) — beri tahu
    // user secara global karena kalau tidak, halaman cuma terlihat "diam".
    if (!error.response && !isNoRefreshPath(originalRequest?.url)) {
      toast.error('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
    }

    if (status !== 401 || !originalRequest || isNoRefreshPath(originalRequest.url)) {
      if (status === 401 && isNoRefreshPath(originalRequest?.url)) {
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      toast.error('Sesi Anda berakhir, silakan login kembali.');
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      toast.error('Sesi Anda berakhir, silakan login kembali.');
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    }
  },
);

/**
 * Dipanggil sekali saat aplikasi pertama dimuat (lihat App.tsx) — access token
 * sengaja tidak di-persist (lihat auth.store.ts), jadi tiap reload halaman kita
 * "re-hydrate" sesi dengan menukar refresh token (httpOnly cookie, otomatis
 * terkirim browser) jadi access token baru lewat endpoint yang sama dipakai
 * interceptor 401 di bawah. Gagal (cookie tidak ada/kedaluwarsa) berarti
 * memang belum login — itu kondisi normal, bukan error untuk ditampilkan.
 */
export async function bootstrapAuth(): Promise<void> {
  try {
    const { data } = await refreshClient.post('/auth/refresh');
    const { accessToken, user } = data.data;
    useAuthStore.getState().setSession(accessToken, user);
  } catch {
    useAuthStore.getState().logout();
  } finally {
    useAuthStore.getState().setHydrated(true);
  }
}

/**
 * Ekstrak pesan error yang paling informatif dari response API.
 *
 * GlobalExceptionFilter backend mengirim `{ message: "Validation failed", errors: [...] }`
 * untuk error validasi class-validator (per-field) — kalau cuma `message` yang dibaca,
 * user cuma lihat "Validation failed" tanpa tahu field mana yang bermasalah. Fungsi ini
 * memprioritaskan `errors` (daftar pesan per-field) kalau ada, baru fallback ke `message`
 * biasa, baru ke fallback yang dikasih si pemanggil.
 */
export function getErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.join('; ');
  }
  if (typeof data?.message === 'string' && data.message.length > 0) {
    return data.message;
  }
  return fallback;
}
