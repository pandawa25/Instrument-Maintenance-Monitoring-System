import axios from 'axios';
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

    if (status !== 401 || !originalRequest || isNoRefreshPath(originalRequest.url)) {
      if (status === 401 && isNoRefreshPath(originalRequest?.url)) {
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
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
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    }
  },
);
