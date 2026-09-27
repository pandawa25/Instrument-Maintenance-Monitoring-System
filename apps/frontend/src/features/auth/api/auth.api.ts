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
