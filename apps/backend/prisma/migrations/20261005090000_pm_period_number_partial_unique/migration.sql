-- Nomor periode PM boleh dipakai ulang setelah periodenya di-soft-delete.
-- Unique index lama (pm_program_id, period_number) mencakup baris soft-deleted, sehingga nomor
-- milik periode yang sudah dihapus tidak bisa dipakai lagi (error 409 / P2002).
DROP INDEX "pm_periods_pm_program_id_period_number_key";

-- Index biasa pengganti untuk pencarian/pengurutan (mengikuti @@index di schema.prisma).
-- Bukan penjaga uniqueness.
CREATE INDEX "pm_periods_pm_program_id_period_number_idx" ON "pm_periods"("pm_program_id", "period_number");

-- Uniqueness yang sesungguhnya: HANYA untuk periode aktif (deleted_at IS NULL).
--
-- CATATAN UNTUK PENGEMBANG SELANJUTNYA: index ini tidak direpresentasikan di schema.prisma
-- (Prisma tidak punya syntax partial index). Jalankan `prisma migrate dev` dengan --create-only
-- lalu review manual — jangan terima usulan DROP INDEX "pm_periods_active_number_key".
CREATE UNIQUE INDEX "pm_periods_active_number_key" ON "pm_periods"("pm_program_id", "period_number") WHERE "deleted_at" IS NULL;
