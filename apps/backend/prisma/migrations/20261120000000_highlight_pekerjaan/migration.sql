-- Fitur Highlight Pekerjaan: tandai (shared/global, bukan per-user) Corrective Maintenance,
-- PM Period Execution, dan Work Order sebagai "disorot" untuk ditampilkan di halaman
-- /highlights. Non-breaking — kolom baru dengan default false, data lama otomatis tidak
-- ter-highlight.
--
-- CATATAN: partial index (WHERE is_highlighted = true AND deleted_at IS NULL) TIDAK
-- direpresentasikan di schema.prisma (Prisma tidak punya syntax partial index) — sama
-- seperti pola pm_periods_active_number_key. Jangan terima usulan `migrate dev` yang
-- men-drop/mengganti index ini jadi index biasa.

ALTER TABLE "corrective_maintenance" ADD COLUMN "is_highlighted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pm_period_executions" ADD COLUMN "is_highlighted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "work_orders" ADD COLUMN "is_highlighted" BOOLEAN NOT NULL DEFAULT false;

-- Index biasa (dasar, sesuai @@index di schema.prisma) — dipertahankan juga untuk kasus
-- query tanpa filter deleted_at.
CREATE INDEX "corrective_maintenance_is_highlighted_idx" ON "corrective_maintenance"("is_highlighted");
CREATE INDEX "pm_period_executions_is_highlighted_idx" ON "pm_period_executions"("is_highlighted");
CREATE INDEX "work_orders_is_highlighted_idx" ON "work_orders"("is_highlighted");

-- Partial index — dipakai GET /highlights (hanya baris aktif & ditandai).
CREATE INDEX "corrective_maintenance_highlighted_active_idx"
  ON "corrective_maintenance"("maintenance_date" DESC)
  WHERE "is_highlighted" = true AND "deleted_at" IS NULL;

CREATE INDEX "pm_period_executions_highlighted_active_idx"
  ON "pm_period_executions"("execution_date" DESC)
  WHERE "is_highlighted" = true AND "deleted_at" IS NULL;

CREATE INDEX "work_orders_highlighted_active_idx"
  ON "work_orders"("basic_start_date" DESC)
  WHERE "is_highlighted" = true AND "deleted_at" IS NULL;
