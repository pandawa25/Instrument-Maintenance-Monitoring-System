-- Catatan manual internal pada Work Order (bukan field ERP) — lihat komentar di
-- schema.prisma. Nullable, tidak ada default, tidak backfill apa pun.
ALTER TABLE "work_orders" ADD COLUMN "remarks" VARCHAR(1000);
