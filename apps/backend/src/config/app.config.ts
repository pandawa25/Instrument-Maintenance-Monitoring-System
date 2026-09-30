export const appConfig = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev_secret_change_me',
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
