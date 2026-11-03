-- Lacak sumber link equipment per Work Order: IMPORT (auto-match saat commit import, boleh
-- ditimpa import berikutnya) vs MANUAL (dikoreksi lewat relink manual — TIDAK BOLEH ditimpa
-- lagi oleh import berikutnya). Lihat WorkOrder.equipmentLinkSource di schema.prisma dan
-- WORK_ORDER_UPSERT_SQL (work-order-bulk-sql.ts).

-- CreateEnum
CREATE TYPE "WorkOrderEquipmentLinkSource" AS ENUM ('IMPORT', 'MANUAL');

-- AlterTable
-- Default 'IMPORT' untuk semua baris existing — representasi yang benar, karena satu-satunya
-- jalur yang pernah mengisi equipment_id sejauh ini adalah commit import (fitur relink manual
-- baru dipakai sejak migration ini ada).
ALTER TABLE "work_orders" ADD COLUMN "equipment_link_source" "WorkOrderEquipmentLinkSource" NOT NULL DEFAULT 'IMPORT';
