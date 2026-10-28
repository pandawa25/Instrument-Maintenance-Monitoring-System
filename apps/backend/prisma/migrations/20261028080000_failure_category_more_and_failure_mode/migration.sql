-- Failure Category: tambah 3 nilai (hanya menambah — data lama & dashboard tidak tersentuh).
-- Postgres >= 12 mengizinkan ADD VALUE di dalam transaksi selama nilai barunya belum dipakai
-- di migration yang sama (memang tidak dipakai di sini).
ALTER TYPE "FailureCategory" ADD VALUE IF NOT EXISTS 'CONTROL_SYSTEM';
ALTER TYPE "FailureCategory" ADD VALUE IF NOT EXISTS 'UTILITY';
ALTER TYPE "FailureCategory" ADD VALUE IF NOT EXISTS 'OTHER';

-- Failure Mode: field opsional baru (NULL untuk data lama).
CREATE TYPE "FailureMode" AS ENUM ('NO_OUTPUT', 'ERRATIC', 'DRIFT', 'STUCK', 'LEAKAGE', 'PLUGGED', 'SPURIOUS', 'COMMUNICATION_LOSS', 'OTHER');

ALTER TABLE "corrective_maintenance" ADD COLUMN "failure_mode" "FailureMode";
