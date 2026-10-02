-- AlterEnum: status baru untuk Corrective Maintenance.
-- CATATAN: aman di-apply dalam satu transaksi bersama statement lain di bawah selama
-- value baru ini TIDAK dipakai di statement lain pada migration yang sama (restriksi
-- Postgres < 12 soal "ALTER TYPE ... ADD VALUE" sudah dilonggarkan utk kasus ini di PG12+).
ALTER TYPE "MaintenanceStatus" ADD VALUE 'WAITING_MATERIAL';
ALTER TYPE "MaintenanceStatus" ADD VALUE 'CANCELLED';

-- CreateTable: counter generik untuk nomor urut auto-generated (dipakai e-SPK, bisa dipakai
-- fitur lain di masa depan). Lihat komentar di schema.prisma model NumberSequence.
CREATE TABLE "number_sequences" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "number_sequences_key_key" ON "number_sequences"("key");

-- AlterTable: priority (reuse enum Criticality yang sudah ada) — default MEDIUM, non-breaking.
ALTER TABLE "corrective_maintenance" ADD COLUMN "priority" "Criticality" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "corrective_maintenance_priority_idx" ON "corrective_maintenance"("priority");

-- AlterTable: spk_number — tambah dulu sebagai NULLABLE supaya bisa di-backfill untuk
-- data lama, baru di-set NOT NULL + UNIQUE setelah backfill selesai di bawah.
ALTER TABLE "corrective_maintenance" ADD COLUMN "spk_number" VARCHAR(50);

-- DataMigration: backfill spk_number untuk data lama, diurutkan per tahun maintenance_date
-- (konsisten dengan cara penomoran yang dipakai utk record baru — lihat
-- MaintenanceRepository.generateSpkNumber(), yang pakai tahun saat record dibuat).
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
SET "spk_number" = 'ESPK-' || b."yr" || '-' || LPAD(b."rn"::text, 4, '0')
FROM "_spk_backfill" b
WHERE cm."id" = b."id";

-- Seed number_sequences supaya nomor berikutnya yang di-generate aplikasi melanjutkan
-- dari nomor terakhir hasil backfill (bukan mulai dari 1 lagi / bentrok).
-- UUID dibuat tanpa extension (md5+random) karena tidak ada jaminan pgcrypto/uuid-ossp
-- aktif di semua environment deploy.
INSERT INTO "number_sequences" ("id", "key", "last_value", "created_at", "updated_at")
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid,
  'SPK-' || "yr",
  MAX("rn"),
  now(),
  now()
FROM "_spk_backfill"
GROUP BY "yr";

DROP TABLE "_spk_backfill";

-- AlterTable: finalisasi spk_number jadi wajib + unik setelah semua baris lama terisi.
ALTER TABLE "corrective_maintenance" ALTER COLUMN "spk_number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "corrective_maintenance_spk_number_key" ON "corrective_maintenance"("spk_number");
