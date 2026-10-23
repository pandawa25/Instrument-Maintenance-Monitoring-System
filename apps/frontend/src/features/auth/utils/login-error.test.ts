import { describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import { getLoginErrorMessage } from './login-error';

const withStatus = (status: number) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status } as AxiosResponse);

describe('getLoginErrorMessage', () => {
  it('401 → kredensial salah', () => {
    expect(getLoginErrorMessage(withStatus(401))).toBe('Email atau password salah');
  });
  it('tanpa response (CORS/network) → pesan koneksi', () => {
    expect(getLoginErrorMessage(new AxiosError('Network Error'))).toMatch(/terhubung ke server/i);
  });
  it('429 dan 5xx dibedakan', () => {
    expect(getLoginErrorMessage(withStatus(429))).toMatch(/terlalu banyak/i);
    expect(getLoginErrorMessage(withStatus(503))).toMatch(/server sedang bermasalah/i);
  });
  it('error non-axios → pesan generik', () => {
    expect(getLoginErrorMessage(new Error('x'))).toBe('Login gagal. Coba lagi.');
  });
});
