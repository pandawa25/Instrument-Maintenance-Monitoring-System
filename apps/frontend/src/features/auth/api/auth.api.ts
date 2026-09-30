import { api } from '@/lib/axios';
import type { AuthUser } from '@/store/auth.store';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

export async function loginRequest(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data.data;
}

export async function refreshRequest() {
  const { data } = await api.post<LoginResponse>('/auth/refresh');
  return data.data;
}

export async function logoutRequest() {
  // Cabut refresh token di server (device ini saja) & hapus cookie-nya.
  // Dibungkus try/catch oleh pemanggil — logout lokal tetap jalan walau
  // request ini gagal (mis. koneksi putus), jangan sampai user "terjebak".
  await api.post('/auth/logout');
}
