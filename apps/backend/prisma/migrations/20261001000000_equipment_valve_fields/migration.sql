-- CreateEnum
-- Posisi fail-safe aktuator valve saat kehilangan sinyal/power.
CREATE TYPE "FailAction" AS ENUM ('CLOSE', 'OPEN', 'LAST_POSITION');

-- AlterTable: field khusus equipment valve (Control Valve/CV, Solenoid Valve/SV,
-- On-Off Valve/KV, On-Off Valve SIS/UV) — pengganti LRV/URV/Unit untuk tipe tersebut.
-- Semua nullable, tidak ada constraint yang mengikat ke instrument_name_id di level DB
-- (show/hide per tipe instrument murni di frontend, MVP — lihat catatan di schema.prisma).
ALTER TABLE "equipment"
  ADD COLUMN "size" VARCHAR(50),
  ADD COLUMN "rating" VARCHAR(50),
  ADD COLUMN "fail_action" "FailAction";
