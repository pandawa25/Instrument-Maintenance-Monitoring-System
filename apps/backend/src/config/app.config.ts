export const appConfig = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  // Folder penyimpanan file lampiran evidence (Corrective Maintenance & PM
  // Execution). Di Railway, arahkan ke path yang sudah di-mount sebagai
  // Volume (mis. /data/uploads) supaya file tidak hilang tiap redeploy —
  // tanpa Volume, /app/uploads di container ephemeral dan akan hilang.
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
});
