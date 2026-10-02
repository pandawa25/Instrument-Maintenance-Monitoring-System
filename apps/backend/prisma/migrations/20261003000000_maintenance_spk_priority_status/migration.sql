-- AlterEnum: status baru untuk Corrective Maintenance.
-- CATATAN: aman di-apply dalam satu transaksi bersama statement lain di bawah selama
-- value baru ini TIDAK dipakai di statement lain pada migration yang sama (restriksi
-- Postgres < 12 soal "ALTER TYPE ... ADD VALUE" sudah dilonggarkan utk kasus ini di PG12+).
ALTER TYPE "MaintenanceStatus" ADD VALUE 'WAITING_MATERIAL';
ALTER TYPE "MaintenanceStatus" ADD VALUE 'CANCELLED';

-- AlterTable: priority (reuse enum Criticality yang sudah ada) — punya default (MEDIUM),
-- jadi aman ditambahkan ke tabel yang sudah berisi data (Postgres otomatis mengisi default
-- untuk baris lama).
ALTER TABLE "corrective_maintenance" ADD COLUMN "priority" "Criticality" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "corrective_maintenance_priority_idx" ON "corrective_maintenance"("priority");

-- AlterTable: spk_number (e-SPK) — diisi MANUAL oleh user (nomor dari aplikasi e-SPK
-- eksternal, lihat komentar di schema.prisma). SENGAJA dibuat NULLABLE, bukan NOT NULL —
-- kolom wajib tanpa default tidak bisa ditambahkan ke tabel yang sudah berisi data lama
-- (data lama tidak punya nomor e-SPK asli untuk diisi). Data lama tetap NULL sampai
-- dikoreksi manual via form edit; unique index Postgres mengizinkan banyak NULL sekaligus.
-- Wajib-nya field ini untuk record BARU ditegakkan di CreateMaintenanceDto (level aplikasi),
-- bukan di level kolom DB.
ALTER TABLE "corrective_maintenance" ADD COLUMN "spk_number" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "corrective_maintenance_spk_number_key" ON "corrective_maintenance"("spk_number");
