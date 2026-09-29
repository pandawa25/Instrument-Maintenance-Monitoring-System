-- Lepas unique index lama pada equipment.tag_number.
-- Prisma merepresentasikan @unique sebagai CREATE UNIQUE INDEX (bukan table constraint),
-- jadi di-drop dengan DROP INDEX, bukan ALTER TABLE ... DROP CONSTRAINT.
-- Index lama ini mencakup baris yang sudah soft-deleted, sehingga tag_number milik
-- equipment yang sudah dihapus (deleted_at IS NOT NULL) tidak bisa dipakai ulang.
DROP INDEX "equipment_tag_number_key";

-- Index biasa menggantikan constraint unique yang baru saja di-drop (mengikuti @@index([tagNumber])
-- di schema.prisma). Ini BUKAN index yang menjaga uniqueness — hanya index pencarian biasa.
CREATE INDEX "equipment_tag_number_idx" ON "equipment"("tag_number");

-- Constraint uniqueness yang sesungguhnya: case-insensitive (UPPER), dan HANYA berlaku untuk
-- equipment yang masih aktif (deleted_at IS NULL). Setelah equipment di-soft-delete,
-- tag_number-nya bebas dipakai ulang oleh equipment baru.
--
-- CATATAN UNTUK PENGEMBANG SELANJUTNYA: index ini tidak direpresentasikan di schema.prisma
-- (Prisma tidak punya syntax untuk partial index). Kalau menjalankan `prisma migrate dev`
-- setelah ini, WAJIB pakai flag --create-only lalu review manual SQL yang dihasilkan —
-- Prisma bisa mengusulkan DROP INDEX "equipment_tag_number_active_key" karena tidak tahu
-- index ini seharusnya tetap ada. Jangan terima diff itu tanpa dicek.
CREATE UNIQUE INDEX "equipment_tag_number_active_key" ON "equipment" (UPPER("tag_number")) WHERE "deleted_at" IS NULL;
