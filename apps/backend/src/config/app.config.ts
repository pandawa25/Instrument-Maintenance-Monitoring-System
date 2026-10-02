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
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
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
});
