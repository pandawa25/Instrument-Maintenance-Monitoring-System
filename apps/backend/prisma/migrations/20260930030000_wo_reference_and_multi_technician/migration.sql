-- AlterTable: referensi Notifikasi & Work Order (ERP) di Corrective Maintenance
ALTER TABLE "corrective_maintenance"
  ADD COLUMN "notification_number" VARCHAR(50),
  ADD COLUMN "notification_date" DATE,
  ADD COLUMN "notification_status" VARCHAR(50),
  ADD COLUMN "work_order_number" VARCHAR(50),
  ADD COLUMN "work_order_date" DATE,
  ADD COLUMN "work_order_status" VARCHAR(50);

-- AlterTable: referensi Work Order (ERP) di PM Period Execution
ALTER TABLE "pm_period_executions"
  ADD COLUMN "work_order_number" VARCHAR(50),
  ADD COLUMN "work_order_date" DATE,
  ADD COLUMN "work_order_status" VARCHAR(50);

-- CreateTable: technician tambahan (anggota tim) di Corrective Maintenance,
-- terpisah dari technician utama (technician_id) yang sudah ada
CREATE TABLE "corrective_maintenance_technicians" (
    "id" UUID NOT NULL,
    "corrective_maintenance_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corrective_maintenance_technicians_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corrective_maintenance_technicians_corrective_maintenance_id_user_id_key"
  ON "corrective_maintenance_technicians"("corrective_maintenance_id", "user_id");

-- CreateIndex
CREATE INDEX "corrective_maintenance_technicians_user_id_idx" ON "corrective_maintenance_technicians"("user_id");

-- AddForeignKey
ALTER TABLE "corrective_maintenance_technicians"
  ADD CONSTRAINT "corrective_maintenance_technicians_corrective_maintenance_id_fkey"
  FOREIGN KEY ("corrective_maintenance_id") REFERENCES "corrective_maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenance_technicians"
  ADD CONSTRAINT "corrective_maintenance_technicians_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
