-- CreateEnum
CREATE TYPE "SparePartStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "corrective_maintenance" ADD COLUMN "needs_spare_part" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "spare_parts" (
    "id" UUID NOT NULL,
    "kimap" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" "SparePartStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_maintenance_materials" (
    "id" UUID NOT NULL,
    "corrective_maintenance_id" UUID NOT NULL,
    "spare_part_id" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "remarks" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corrective_maintenance_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spare_parts_kimap_key" ON "spare_parts"("kimap");

-- CreateIndex
CREATE INDEX "spare_parts_status_idx" ON "spare_parts"("status");

-- CreateIndex
CREATE INDEX "corrective_maintenance_materials_corrective_maintenance_id_idx" ON "corrective_maintenance_materials"("corrective_maintenance_id");

-- CreateIndex
CREATE INDEX "corrective_maintenance_materials_spare_part_id_idx" ON "corrective_maintenance_materials"("spare_part_id");

-- AddForeignKey
ALTER TABLE "corrective_maintenance_materials" ADD CONSTRAINT "corrective_maintenance_materials_corrective_maintenance_id_fkey" FOREIGN KEY ("corrective_maintenance_id") REFERENCES "corrective_maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenance_materials" ADD CONSTRAINT "corrective_maintenance_materials_spare_part_id_fkey" FOREIGN KEY ("spare_part_id") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
