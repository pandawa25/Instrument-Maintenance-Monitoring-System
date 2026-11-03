-- Modul Notification & Work Order (link ERP, mis. SAP PM) — lihat
-- docs/design-notification-work-order.md untuk analisis & keputusan desain lengkap.

-- Postgres >= 12 mengizinkan ADD VALUE di dalam transaksi selama nilai barunya belum dipakai
-- di migration yang sama (sama seperti pola di 20261028080000_failure_category_more_and_failure_mode).
-- Nilai 'WORK_ORDER' di sini TIDAK dipakai di statement manapun pada migration ini.
ALTER TYPE "PermissionModule" ADD VALUE IF NOT EXISTS 'WORK_ORDER';
ALTER TYPE "ImportEntityType" ADD VALUE IF NOT EXISTS 'WORK_ORDER';

-- CreateEnum
-- Diturunkan dari token pertama System Status ERP (CRTD/REL/TECO/CLSD) — terbukti saling
-- eksklusif di seluruh data sample (lihat design doc §2). Type baru (CREATE TYPE, bukan ALTER
-- TYPE ADD VALUE), jadi boleh langsung dipakai di tabel work_orders pada migration yang sama.
CREATE TYPE "WorkOrderLifecycleStage" AS ENUM ('CREATED', 'RELEASED', 'TECHNICALLY_COMPLETED', 'CLOSED');

-- CreateTable
-- Ramping: file sumber ERP tidak punya kolom status/deskripsi terpisah untuk Notification
-- (hanya ada di level Order) — lihat catatan di schema.prisma.
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "notification_no" VARCHAR(50) NOT NULL,
    "equipment_id" UUID,
    "equipment_tag_raw" VARCHAR(50),
    "functional_location" VARCHAR(100),
    "plant" VARCHAR(20),
    "created_on_erp" DATE,
    "import_batch_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" UUID NOT NULL,
    "order_no" VARCHAR(50) NOT NULL,
    "notification_id" UUID,
    "equipment_id" UUID,
    "equipment_tag_raw" VARCHAR(50),
    "order_type" VARCHAR(10),
    "maint_activ_type" VARCHAR(10),
    "description" VARCHAR(255) NOT NULL,
    "functional_location" VARCHAR(100),
    "plant" VARCHAR(20),
    "basic_start_date" DATE,
    "basic_fin_date" DATE,
    "user_status" VARCHAR(100),
    "system_status" VARCHAR(150),
    "lifecycle_stage" "WorkOrderLifecycleStage" NOT NULL DEFAULT 'CREATED',
    "actual_release" DATE,
    "actual_finish" DATE,
    "cost_center" VARCHAR(20),
    "planner_group" VARCHAR(20),
    "main_work_center" VARCHAR(20),
    "total_planned_cost" DECIMAL(14,2),
    "total_actual_cost" DECIMAL(14,2),
    "priority" VARCHAR(10),
    "superior_order_id" UUID,
    "import_batch_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- AlterTable
-- Link OPSIONAL ke WorkOrder — field notificationNumber/workOrderNumber dkk yang sudah ada
-- TETAP ADA, tidak dihapus/dikunci (fallback kalau WO resmi belum ter-import dari ERP).
ALTER TABLE "corrective_maintenance" ADD COLUMN "work_order_id" UUID;

-- CreateIndex (biasa — bukan yang menjaga uniqueness, lihat partial unique index di bawah)
CREATE INDEX "notifications_equipment_id_idx" ON "notifications"("equipment_id");
CREATE INDEX "notifications_import_batch_id_idx" ON "notifications"("import_batch_id");
CREATE INDEX "notifications_notification_no_idx" ON "notifications"("notification_no");

CREATE INDEX "work_orders_equipment_id_idx" ON "work_orders"("equipment_id");
CREATE INDEX "work_orders_notification_id_idx" ON "work_orders"("notification_id");
CREATE INDEX "work_orders_import_batch_id_idx" ON "work_orders"("import_batch_id");
CREATE INDEX "work_orders_lifecycle_stage_idx" ON "work_orders"("lifecycle_stage");
CREATE INDEX "work_orders_order_no_idx" ON "work_orders"("order_no");

CREATE INDEX "corrective_maintenance_work_order_id_idx" ON "corrective_maintenance"("work_order_id");

-- Uniqueness sesungguhnya: case-insensitive (UPPER), HANYA untuk baris aktif (deleted_at IS NULL).
-- Pola identik dengan equipment_tag_number_active_key (lihat migration
-- 20260928000100_equipment_tag_partial_unique) dan spare_parts.kimap — TIDAK direpresentasikan
-- sebagai @unique di schema.prisma. Kalau menjalankan `prisma migrate dev` setelah mengubah
-- model Notification/WorkOrder, WAJIB pakai --create-only + review manual, Prisma bisa
-- mengusulkan DROP INDEX untuk kedua index ini karena tidak tahu soal partial index.
CREATE UNIQUE INDEX "notifications_notification_no_active_key" ON "notifications" (UPPER("notification_no")) WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "work_orders_order_no_active_key" ON "work_orders" (UPPER("order_no")) WHERE "deleted_at" IS NULL;

-- AddForeignKey
-- Semua FK opsional (nullable) di-set SET NULL saat parent-nya dihapus, konsisten dengan
-- pola Equipment.importBatchId/instrumentNameId yang sudah ada — supaya data WorkOrder/
-- Notification tidak ikut hilang kalau equipment/import batch sumbernya di-soft-delete
-- (soft delete via deletedAt tidak memicu FK constraint sama sekali, tapi hard-reference
-- masih dijaga untuk kasus lain).
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_superior_order_id_fkey" FOREIGN KEY ("superior_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "corrective_maintenance" ADD CONSTRAINT "corrective_maintenance_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
