import { BadRequestException } from '@nestjs/common';
import { MaintenanceStatus } from '@prisma/client';

/**
 * Transisi status yang diizinkan untuk Corrective Maintenance.
 *
 * Tanpa validasi ini, client bisa kirim transisi status BEBAS — termasuk
 * yang tidak masuk akal secara operasional (mis. COMPLETED -> OPEN setelah
 * pekerjaan selesai dilaporkan, atau CANCELLED -> IN_PROGRESS menghidupkan
 * lagi pekerjaan yang sudah dibatalkan). Data histori maintenance dipakai
 * untuk KPI/reliability analysis, jadi integritas urutan status penting.
 *
 * COMPLETED dan CANCELLED sengaja TERMINAL (tidak ada transisi keluar) —
 * kalau ada kesalahan input setelah status itu, perbaikan dilakukan lewat
 * Admin yang edit field lain (bukan ubah status), atau proses koreksi data
 * terpisah di luar scope MVP ini.
 */
const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_MATERIAL', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_MATERIAL', 'COMPLETED', 'CANCELLED'],
  WAITING_MATERIAL: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Validasi transisi `currentStatus` -> `nextStatus`. Tidak melakukan apapun
 * (no-op) kalau status tidak berubah — PUT parsial yang ikut kirim status
 * lama tetap valid.
 */
export function validateStatusTransition(currentStatus: MaintenanceStatus, nextStatus: MaintenanceStatus): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Transisi status dari '${currentStatus}' ke '${nextStatus}' tidak diizinkan. ` +
        (allowed.length
          ? `Transisi yang valid dari '${currentStatus}': ${allowed.join(', ')}.`
          : `'${currentStatus}' adalah status akhir (tidak bisa diubah lagi).`),
    );
  }
}

/**
 * COMPLETED wajib punya completionDate — tanpa ini, laporan downtime/MTTR
 * tidak punya tanggal selesai yang valid. `completionDate` boleh datang dari
 * record yang sudah ada (update parsial) ATAU dari dto saat ini.
 */
export function validateCompletionDateRequirement(
  resultingStatus: MaintenanceStatus,
  resultingCompletionDate: Date | string | null | undefined,
): void {
  if (resultingStatus === 'COMPLETED' && !resultingCompletionDate) {
    throw new BadRequestException("completionDate wajib diisi saat status diubah menjadi 'COMPLETED'");
  }
}
