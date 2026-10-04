-- AlterEnum
-- Tambah mode upsert untuk Bulk Upload Equipment (lihat ImportMode di schema.prisma)
ALTER TYPE "ImportMode" ADD VALUE 'UPDATE_OR_CREATE';

-- CreateEnum
CREATE TYPE "ImportRowAction" AS ENUM ('CREATE', 'UPDATE', 'NO_CHANGE');

-- CreateEnum
CREATE TYPE "BulkOperationSource" AS ENUM ('IMPORT_UPSERT', 'MANUAL_BULK_EDIT');

-- CreateEnum
CREATE TYPE "BulkOperationStatus" AS ENUM ('COMMITTED', 'REVERTED');

-- AlterTable
-- Nullable — hanya terisi untuk baris dari batch mode UPDATE_OR_CREATE. Baris lama
-- (mode CREATE_ONLY, sudah ada sebelum migration ini) tetap valid dengan kedua kolom NULL.
ALTER TABLE "import_batch_rows" ADD COLUMN "action" "ImportRowAction";
ALTER TABLE "import_batch_rows" ADD COLUMN "target_equipment_id" UUID;

-- CreateIndex
CREATE INDEX "import_batch_rows_target_equipment_id_idx" ON "import_batch_rows"("target_equipment_id");

-- AddForeignKey
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_target_equipment_id_fkey" FOREIGN KEY ("target_equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
-- Satu "peristiwa" perubahan massal equipment yang bisa di-rollback (lihat catatan desain
-- lengkap di schema.prisma, model EquipmentBulkOperation).
CREATE TABLE "equipment_bulk_operations" (
    "id" UUID NOT NULL,
    "source" "BulkOperationSource" NOT NULL,
    "import_batch_id" UUID,
    "status" "BulkOperationStatus" NOT NULL DEFAULT 'COMMITTED',
    "affected_count" INTEGER NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reverted_at" TIMESTAMP(3),
    "reverted_by_id" UUID,

    CONSTRAINT "equipment_bulk_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_change_snapshots" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "before_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_change_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_bulk_operations_import_batch_id_idx" ON "equipment_bulk_operations"("import_batch_id");

-- CreateIndex
CREATE INDEX "equipment_bulk_operations_status_idx" ON "equipment_bulk_operations"("status");

-- CreateIndex
CREATE INDEX "equipment_bulk_operations_created_by_id_idx" ON "equipment_bulk_operations"("created_by_id");

-- CreateIndex
CREATE INDEX "equipment_change_snapshots_operation_id_idx" ON "equipment_change_snapshots"("operation_id");

-- CreateIndex
CREATE INDEX "equipment_change_snapshots_equipment_id_idx" ON "equipment_change_snapshots"("equipment_id");

-- AddForeignKey
ALTER TABLE "equipment_bulk_operations" ADD CONSTRAINT "equipment_bulk_operations_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_bulk_operations" ADD CONSTRAINT "equipment_bulk_operations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_bulk_operations" ADD CONSTRAINT "equipment_bulk_operations_reverted_by_id_fkey" FOREIGN KEY ("reverted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_change_snapshots" ADD CONSTRAINT "equipment_change_snapshots_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "equipment_bulk_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
