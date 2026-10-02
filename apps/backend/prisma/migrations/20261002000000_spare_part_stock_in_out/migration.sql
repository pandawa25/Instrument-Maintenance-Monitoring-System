-- AlterEnum
-- Tipe pergerakan stock manual baru: "Stock Out" (keluar stock di luar Corrective
-- Maintenance — dipakai di lapangan tanpa tiket CM, rusak/scrap, pindah project).
-- CATATAN: kalau `prisma migrate deploy` gagal dengan error "ALTER TYPE ... ADD VALUE
-- cannot run inside a transaction block" (Postgres < 12), pisahkan baris ini jadi
-- migration tersendiri yang di-apply lebih dulu sebelum baris ALTER TABLE di bawah.
ALTER TYPE "StockMovementType" ADD VALUE 'STOCK_OUT';

-- AlterTable
-- Ambang batas low-stock per spare part untuk Inventory Dashboard — default 0 (non-breaking,
-- data lama otomatis dianggap "tidak ada ambang" sampai Admin mengisinya manual).
ALTER TABLE "spare_parts"
  ADD COLUMN "min_stock" INTEGER NOT NULL DEFAULT 0;
