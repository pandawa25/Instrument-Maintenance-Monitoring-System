-- 1) Tanggal transaksi pada ledger stock (movement_date)
--    created_at = waktu input ke sistem; movement_date = tanggal transaksi sebenarnya.
--    Kolom DATE tanpa default DB — selalu diisi aplikasi (SparePartsRepository.recordMovement).
ALTER TABLE "spare_part_stock_movements" ADD COLUMN "movement_date" DATE;

-- Baris lama: tanggal input dalam zona waktu Asia/Jakarta (created_at disimpan sbg UTC).
UPDATE "spare_part_stock_movements"
SET "movement_date" = (("created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date;

-- Pemakaian/pengembalian dari Corrective Maintenance yang sudah punya tanggal selesai
-- memakai tanggal selesai CM sebagai tanggal transaksinya (keputusan 5 Okt 2026).
UPDATE "spare_part_stock_movements" m
SET "movement_date" = cm."completion_date"
FROM "corrective_maintenance" cm
WHERE m."reference_type" = 'CORRECTIVE_MAINTENANCE'
  AND m."reference_id" = cm."id"
  AND m."type" IN ('MAINTENANCE_USAGE', 'MAINTENANCE_RETURN')
  AND cm."completion_date" IS NOT NULL;

ALTER TABLE "spare_part_stock_movements" ALTER COLUMN "movement_date" SET NOT NULL;

CREATE INDEX "spare_part_stock_movements_movement_date_idx" ON "spare_part_stock_movements"("movement_date");

-- 2) Aturan baru: stock Corrective Maintenance dipotong saat status COMPLETED (bukan saat CM dibuat).
--    CM yang BELUM Completed dan sudah terlanjur memotong stock (aturan lama) dikoreksi:
--    sisa pemakaian netto dikembalikan lewat 1 baris ledger MAINTENANCE_RETURN per (CM, spare part),
--    supaya tidak terpotong dua kali saat nanti di-Completed. CM Cancelled/terhapus sudah netto 0
--    (sudah di-restore aturan lama), jadi otomatis dilewati oleh HAVING > 0.
--    Tanggal transaksi koreksi = tanggal pemakaian aslinya (bukan hari ini), supaya pemakaian
--    lama dan koreksinya saling meniadakan di bulan yang sama pada tren Stock Out.
DO $$
DECLARE
  r RECORD;
  new_balance NUMERIC;
BEGIN
  FOR r IN
    SELECT m."reference_id" AS cm_id,
           m."spare_part_id" AS spare_part_id,
           cm."created_by_id" AS actor_id,
           MAX(m."movement_date") AS usage_date,
           SUM(-m."quantity_delta") AS net
    FROM "spare_part_stock_movements" m
    JOIN "corrective_maintenance" cm ON cm."id" = m."reference_id"
    WHERE m."reference_type" = 'CORRECTIVE_MAINTENANCE'
      AND m."type" IN ('MAINTENANCE_USAGE', 'MAINTENANCE_RETURN')
      AND cm."status" <> 'COMPLETED'
      AND cm."deleted_at" IS NULL
    GROUP BY m."reference_id", m."spare_part_id", cm."created_by_id"
    HAVING SUM(-m."quantity_delta") > 0
  LOOP
    UPDATE "spare_parts"
    SET "stock" = "stock" + r.net, "updated_at" = NOW()
    WHERE "id" = r.spare_part_id
    RETURNING "stock" INTO new_balance;

    INSERT INTO "spare_part_stock_movements"
      ("id", "spare_part_id", "type", "quantity_delta", "balance_after", "reference_type", "reference_id",
       "notes", "movement_date", "created_by_id", "created_at")
    VALUES
      (gen_random_uuid(), r.spare_part_id, 'MAINTENANCE_RETURN', r.net, new_balance, 'CORRECTIVE_MAINTENANCE', r.cm_id,
       'Koreksi otomatis: stock Corrective Maintenance kini dipotong saat status Completed',
       r.usage_date, r.actor_id, NOW());
  END LOOP;
END $$;
