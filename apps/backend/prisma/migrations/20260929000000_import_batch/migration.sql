-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('EQUIPMENT');

-- CreateEnum
CREATE TYPE "ImportMode" AS ENUM ('CREATE_ONLY');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('VALIDATED', 'COMMITTED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ImportRowSeverity" AS ENUM ('OK', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "entity_type" "ImportEntityType" NOT NULL,
    "mode" "ImportMode" NOT NULL DEFAULT 'CREATE_ONLY',
    "filename" VARCHAR(255) NOT NULL,
    "file_checksum" VARCHAR(64) NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'VALIDATED',
    "total_rows" INTEGER NOT NULL,
    "ok_rows" INTEGER NOT NULL,
    "warning_rows" INTEGER NOT NULL,
    "error_rows" INTEGER NOT NULL,
    "created_by_id" UUID NOT NULL,
    "committed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch_rows" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "severity" "ImportRowSeverity" NOT NULL,
    "messages" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "import_batch_rows_pkey" PRIMARY KEY ("id")
);

-- AlterTable
-- Nullable — mayoritas equipment tetap dibuat manual lewat form, bukan dari import.
ALTER TABLE "equipment" ADD COLUMN "import_batch_id" UUID;

-- CreateIndex
-- Index biasa (bukan unique) — lihat catatan uniqueness di bawah.
CREATE INDEX "import_batches_entity_type_file_checksum_idx" ON "import_batches"("entity_type", "file_checksum");

-- CreateIndex
CREATE INDEX "import_batches_status_idx" ON "import_batches"("status");

-- CreateIndex
CREATE INDEX "import_batches_created_by_id_idx" ON "import_batches"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_batch_rows_batch_id_row_number_key" ON "import_batch_rows"("batch_id", "row_number");

-- CreateIndex
CREATE INDEX "import_batch_rows_batch_id_severity_idx" ON "import_batch_rows"("batch_id", "severity");

-- CreateIndex
CREATE INDEX "equipment_import_batch_id_idx" ON "equipment"("import_batch_id");

-- Uniqueness sesungguhnya untuk file_checksum: HANYA mencegah file yang identik persis
-- di-commit dua kali (mis. reupload tidak sengaja setelah sukses). TIDAK menghalangi user
-- preview file yang sama berkali-kali sebelum commit (banyak batch VALIDATED dengan checksum
-- sama boleh saja ada sekaligus).
CREATE UNIQUE INDEX "import_batches_checksum_committed_key" ON "import_batches" ("entity_type", "file_checksum") WHERE "status" = 'COMMITTED';

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- Nullable relation -> default Prisma: SET NULL saat batch-nya dihapus (bukan block/cascade).
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
