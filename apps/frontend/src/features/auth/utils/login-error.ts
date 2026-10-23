import axios from 'axios';

/**
 * Pesan error login yang membedakan penyebab sebenarnya.
 * - 401 → kredensial salah
 * - 429 → terlalu banyak percobaan
 * - tanpa response (CORS diblok / server mati / URL API salah) → masalah koneksi, BUKAN kredensial
 */
export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Tidak dapat terhubung ke server. Periksa koneksi atau konfigurasi CORS/API URL.';
    }
    const { status } = error.response;
    if (status === 401) return 'Email atau password salah';
    if (status === 429) return 'Terlalu banyak percobaan login. Coba lagi beberapa saat.';
    if (status >= 500) return 'Server sedang bermasalah. Coba lagi beberapa saat.';
  }
  return 'Login gagal. Coba lagi.';
}
