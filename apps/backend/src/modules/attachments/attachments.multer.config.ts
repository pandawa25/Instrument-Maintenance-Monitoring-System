import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

// Hanya foto + PDF (evidence pengerjaan) — sesuai keputusan design review Phase 2.
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_ENTITY = 10;

/**
 * Root folder penyimpanan file — dibaca langsung dari process.env (bukan lewat
 * ConfigService) karena opsi multer dievaluasi saat module load, sebelum DI
 * container siap. Konsisten dengan appConfig() yang juga baca process.env
 * langsung. Di Railway, UPLOAD_DIR wajib diarahkan ke path yang di-mount
 * sebagai Volume supaya file tidak hilang tiap redeploy.
 */
export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
}

// File dikelompokkan per tahun/bulan supaya 1 folder tidak membengkak — TIDAK
// dikelompokkan per entityId, karena body multipart (entityType/entityId) belum
// tentu sudah ter-parse saat callback destination() dipanggil multer.
export const attachmentMulterOptions = {
  storage: diskStorage({
    destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
      const now = new Date();
      const dir = join(getUploadRoot(), String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      // Nama unik (bukan nama asli) — menghindari collision & path traversal dari input user.
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException('Tipe file tidak didukung — hanya JPEG, PNG, WEBP, atau PDF'), false);
      return;
    }
    cb(null, true);
  },
};
