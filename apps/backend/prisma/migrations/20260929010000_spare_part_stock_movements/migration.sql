-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('MAINTENANCE_USAGE', 'MAINTENANCE_RETURN', 'RESTOCK', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "spare_part_stock_movements" (
    "id" UUID NOT NULL,
    "spare_part_id" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "notes" VARCHAR(255),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spare_part_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spare_part_stock_movements_spare_part_id_idx" ON "spare_part_stock_movements"("spare_part_id");

-- CreateIndex
CREATE INDEX "spare_part_stock_movements_reference_type_reference_id_idx" ON "spare_part_stock_movements"("reference_type", "reference_id");

-- AddForeignKey
ALTER TABLE "spare_part_stock_movements" ADD CONSTRAINT "spare_part_stock_movements_spare_part_id_fkey" FOREIGN KEY ("spare_part_id") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part_stock_movements" ADD CONSTRAINT "spare_part_stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
