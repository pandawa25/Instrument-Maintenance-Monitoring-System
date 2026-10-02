-- AlterEnum: status baru untuk Corrective Maintenance.
-- CATATAN: aman di-apply dalam satu transaksi bersama statement lain di bawah selama
-- value baru ini TIDAK dipakai di statement lain pada migration yang sama (restriksi
-- Postgres < 12 soal "ALTER TYPE ... ADD VALUE" sudah dilonggarkan utk kasus ini di PG12+).
ALTER TYPE "MaintenanceStatus" ADD VALUE 'WAITING_MATERIAL';
ALTER TYPE "MaintenanceStatus" ADD VALUE 'CANCELLED';

-- AlterTable: priority (reuse enum Criticality yang sudah ada) — default MEDIUM, non-breaking.
ALTER TABLE "corrective_maintenance" ADD COLUMN "priority" "Criticality" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "corrective_maintenance_priority_idx" ON "corrective_maintenance"("priority");

-- AlterTable: spk_number — diisi MANUAL oleh user (nomor dari aplikasi e-SPK eksternal, lihat
-- komentar di schema.prisma). Tambah dulu sebagai NULLABLE supaya bisa di-backfill untuk data
-- lama (yang dibuat sebelum field ini ada), baru di-set NOT NULL + UNIQUE setelah itu.
ALTER TABLE "corrective_maintenance" ADD COLUMN "spk_number" VARCHAR(50);

-- DataMigration: backfill spk_number untuk data lama dengan placeholder "LEGACY-..." (bukan
-- nomor e-SPK asli — data lama ini dibuat sebelum e-SPK dicatat di sistem, jadi tidak ada
-- nomor asli untuk diisi). User bisa edit manual ke nomor e-SPK yang benar via form edit kalau
-- perlu. Diurutkan per tahun maintenance_date supaya placeholder tetap unik & rapi.
CREATE TEMP TABLE "_spk_backfill" AS
SELECT
  "id",
  EXTRACT(YEAR FROM "maintenance_date")::int AS "yr",
  ROW_NUMBER() OVER (
    PARTITION BY EXTRACT(YEAR FROM "maintenance_date")
    ORDER BY "maintenance_date", "created_at"
  ) AS "rn"
FROM "corrective_maintenance";

UPDATE "corrective_maintenance" cm
SET "spk_number" = 'LEGACY-' || b."yr" || '-' || LPAD(b."rn"::text, 4, '0')
FROM "_spk_backfill" b
WHERE cm."id" = b."id";

DROP TABLE "_spk_backfill";

-- AlterTable: finalisasi spk_number jadi wajib + unik setelah semua baris lama terisi.
ALTER TABLE "corrective_maintenance" ALTER COLUMN "spk_number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "corrective_maintenance_spk_number_key" ON "corrective_maintenance"("spk_number");
