-- AlterEnum
-- Lampiran dokumen (foto / datasheet) untuk Master Equipment. Hanya menambah nilai enum —
-- tabel `attachments` tidak berubah, data lama tidak tersentuh.
-- Postgres >= 12 mengizinkan ADD VALUE di dalam transaksi selama nilai barunya belum dipakai
-- di migration yang sama (memang tidak dipakai di sini).
ALTER TYPE "AttachmentEntityType" ADD VALUE IF NOT EXISTS 'EQUIPMENT';
