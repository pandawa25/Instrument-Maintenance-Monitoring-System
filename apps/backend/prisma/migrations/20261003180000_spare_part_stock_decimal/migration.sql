ALTER TABLE "spare_parts" ALTER COLUMN "stock" TYPE DECIMAL(10,2) USING "stock"::numeric(10,2);
ALTER TABLE "spare_parts" ALTER COLUMN "stock" SET DEFAULT 0;
ALTER TABLE "spare_parts" ALTER COLUMN "min_stock" TYPE DECIMAL(10,2) USING "min_stock"::numeric(10,2);
ALTER TABLE "spare_parts" ALTER COLUMN "min_stock" SET DEFAULT 0;
ALTER TABLE "spare_part_stock_movements" ALTER COLUMN "quantity_delta" TYPE DECIMAL(10,2) USING "quantity_delta"::numeric(10,2);
ALTER TABLE "spare_part_stock_movements" ALTER COLUMN "balance_after" TYPE DECIMAL(10,2) USING "balance_after"::numeric(10,2);