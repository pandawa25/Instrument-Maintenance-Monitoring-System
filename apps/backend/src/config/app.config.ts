import { parseCorsOrigins } from './cors.util';

const MIN_JWT_SECRET_LENGTH = 32;

// JWT_SECRET WAJIB kuat di production — tanpa validasi ini, aplikasi akan tetap
// boot normal walau env var lupa di-set/typo saat deploy, lalu diam-diam memakai
// secret hardcoded yang ada di source code (publik di GitHub). Siapapun yang baca
// source bisa forge access token dengan role Admin. Fail fast di production;
// di development/test cukup warning supaya onboarding lokal tetap mudah.
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';

  if (secret && secret.length >= MIN_JWT_SECRET_LENGTH) {
    return secret;
  }

  if (isProduction) {
    throw new Error(
      `JWT_SECRET wajib di-set (minimal ${MIN_JWT_SECRET_LENGTH} karakter) saat NODE_ENV=production. ` +
        'Set environment variable JWT_SECRET di Railway/deployment target sebelum deploy ulang.',
    );
  }

  // eslint-disable-next-line no-console
  console.warn(
    `[app.config] PERINGATAN: JWT_SECRET tidak di-set atau kurang dari ${MIN_JWT_SECRET_LENGTH} karakter — ` +
      'memakai secret development bawaan. JANGAN deploy kondisi ini ke production.',
  );
  return 'dev_secret_change_me__please_set_JWT_SECRET_env_var';
}

export const appConfig = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Daftar origin frontend yang diizinkan (CORS_ORIGIN, boleh beberapa dipisah koma,
  // dinormalisasi — lihat cors.util.ts).
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  // Jumlah proxy tepercaya di depan app (Railway edge = 1; tambah 1 kalau juga lewat
  // Cloudflare proxy "orange cloud"). Menentukan req.ip yang dipakai rate limiter &
  // login history. 0 = tanpa proxy (lokal). Default 1 di production, 0 selain itu.
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, (process.env.NODE_ENV ?? 'development') === 'production'),
  jwt: {
    secret: resolveJwtSecret(),
    // Access token sengaja pendek (default 15 menit) — sesi panjang ditangani
    // refresh token (httpOnly cookie), bukan access token berumur panjang.
    // Kalau access token bocor, jendela penyalahgunaannya kecil.
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  // Cookie refresh token wajib Secure kalau SameSite=None (browser menolak
  // kombinasi None + non-Secure). Default ikut NODE_ENV, tapi bisa dipaksa
  // via COOKIE_SECURE — perlu di docker-compose lokal (NODE_ENV=production
  // tapi jalan di HTTP polos, bukan di belakang HTTPS seperti Railway).
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : (process.env.NODE_ENV ?? 'development') === 'production',
  // Folder penyimpanan file lampiran evidence (Corrective Maintenance & PM
  // Execution). Di Railway, arahkan ke path yang sudah di-mount sebagai
  // Volume (mis. /data/uploads) supaya file tidak hilang tiap redeploy —
  // tanpa Volume, /app/uploads di container ephemeral dan akan hilang.
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  // Opsional. Isi mis. ".tigalimabelas.com" kalau cookie refresh token harus bisa dibaca
  // dari semua subdomain (frontend & API beda subdomain). Kosong = host-only cookie.
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  // Opsional override: 'none' | 'lax' | 'strict'. Default: 'none' kalau Secure, selain itu 'lax'.
  // Kalau frontend & API satu "site" (mis. tigalimabelas.com & api.tigalimabelas.com), 'lax'
  // lebih aman dan tidak terkena pemblokiran third-party cookie browser.
  cookieSameSite: parseSameSite(process.env.COOKIE_SAMESITE),
});

function parseTrustProxy(raw: string | undefined, isProduction: boolean): number {
  if (raw !== undefined && raw.trim() !== '') {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return isProduction ? 1 : 0;
}

function parseSameSite(raw: string | undefined): 'none' | 'lax' | 'strict' | undefined {
  const v = raw?.trim().toLowerCase();
  return v === 'none' || v === 'lax' || v === 'strict' ? v : undefined;
}
