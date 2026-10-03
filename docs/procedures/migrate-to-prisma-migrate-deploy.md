# Prosedur: Migrasi dari `prisma db push` ke `prisma migrate deploy`

**Status**: Belum dieksekusi — perlu dijalankan manual oleh pengembang di mesin
dengan akses internet penuh ke `binaries.prisma.sh` (sandbox pengembangan ini
diblokir aksesnya, lihat catatan di `README.md` bagian "Migration & Seed").

Terkait Risk #2 (Tinggi) di Technical Debt & Risk Register (`docs/roadmap.md`).

## Kenapa ini penting

Deployment saat ini (`docker/Dockerfile.backend`, baris `CMD`) memakai:

```bash
npx prisma db push --skip-generate --accept-data-loss --schema=./prisma/schema.prisma
```

`db push` menyamakan paksa schema DB ke `schema.prisma` tanpa riwayat migration
yang bisa di-review. Konsekuensi nyata:

- Tidak ada file diff schema yang bisa di-code-review seperti PR biasa.
- `--accept-data-loss` otomatis menyetujui operasi destruktif (drop column/table)
  tanpa konfirmasi — kesalahan di schema bisa langsung menghapus data production.
- Rollback container ke image lama **tidak** otomatis rollback schema (sudah
  didokumentasikan prosedur manualnya di README, tapi tetap rawan human error).

## Prasyarat

- Komputer dengan akses internet penuh (bisa `curl -I https://binaries.prisma.sh`
  tanpa 403).
- `DATABASE_URL` yang valid (boleh local Docker Postgres untuk generate file
  migration-nya — **tidak perlu** akses ke DB production di langkah ini).
- Branch kerja terpisah (jangan langsung di `main`).

## Langkah-langkah

### 1. Generate migration awal (baseline) dari schema saat ini

Karena `prisma/migrations/` belum pernah ada, langkah pertama adalah membuat
baseline yang mencerminkan schema yang sudah berjalan di production (23 model),
BUKAN membuat migration kosong dari nol — kalau tidak, Prisma akan mengira semua
tabel belum ada dan mencoba `CREATE TABLE` ulang terhadap DB production yang
sudah berisi data.

```bash
cd apps/backend

# a) Pastikan DB lokal (docker compose) schema-nya SAMA dengan production saat ini
#    (sebelum migrasi Decimal di langkah 2) — paling aman: restore dump production
#    terbaru ke DB lokal, atau jalankan `prisma db push` sekali di DB lokal kosong.

# b) Generate migration baseline tanpa benar-benar apply ke DB manapun:
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_baseline/migration.sql

# c) Tandai baseline ini sudah "applied" di DB production (jangan dijalankan ulang):
#    baru lakukan ini TERHADAP DATABASE_URL PRODUCTION, setelah backup manual
#    (lihat README bagian "Backup — wajib sebelum deploy yang mengubah schema").
npx prisma migrate resolve --applied 0_baseline --schema=prisma/schema.prisma
```

> Alternatif lebih sederhana (kalau tidak keberatan 1x downtime singkat untuk
> re-seed): backup production, generate migration baseline dengan
> `prisma migrate dev --name init` di DB **lokal kosong**, lalu jalankan
> `prisma migrate deploy` ke production dari kondisi fresh. Pilih sesuai
> toleransi downtime dan ukuran data production saat ini.

### 2. Generate migration untuk perubahan Decimal (Risk #1, sudah di-commit)

Setelah baseline ter-apply, generate migration berikutnya untuk perubahan
`SparePart.stock`/`minStock`/`SparePartStockMovement.quantityDelta`/`balanceAfter`
dari `Int` ke `Decimal(10,2)` (schema sudah diubah di commit `5ed9f17`):

```bash
npx prisma migrate dev --name spare_part_stock_decimal --schema=prisma/schema.prisma
```

Prisma akan mendeteksi `Int → Decimal` sebagai perubahan tipe yang **berpotensi
data loss** (akan minta konfirmasi). Untuk kolom `stock`/`minStock` ini aman
(nilai integer existing otomatis valid sebagai Decimal), tapi **review dulu**
SQL yang digenerate sebelum approve — pastikan Prisma pakai `ALTER COLUMN ...
TYPE numeric(10,2)` (implicit cast), bukan drop-and-recreate column.

### 3. Commit file migration

```bash
git add apps/backend/prisma/migrations/
git commit -m "chore(db): tambah migration formal (baseline + stock decimal)"
```

### 4. Ubah Dockerfile dari `db push` ke `migrate deploy`

Di `docker/Dockerfile.backend`, ganti baris `CMD`:

```dockerfile
# Sebelum:
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss --schema=./prisma/schema.prisma && node dist/main.js"]

# Sesudah:
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
```

Hapus juga komentar "CATATAN SEMENTARA" di atasnya (sudah tidak relevan).

### 5. Deploy & verifikasi

1. Backup manual DB production (lihat README).
2. Deploy branch ini ke Railway staging/preview environment dulu kalau ada,
   atau langsung production dengan jendela maintenance singkat.
3. Setelah deploy, cek Railway logs — `migrate deploy` akan mencetak daftar
   migration yang diterapkan. Pastikan tidak ada error.
4. Smoke test: login, buka 1 halaman per modul, khususnya Spare Part (cek
   stock desimal tersimpan benar) dan Corrective Maintenance (cek pemakaian
   material part satuan non-bulat).
5. Untuk perubahan schema berikutnya setelah ini, alur jadi normal:
   `prisma migrate dev --name <deskripsi>` di lokal → commit migration → deploy
   (CI/Railway otomatis jalankan `migrate deploy`). Tidak perlu lagi prosedur
   manual seperti di atas — itu hanya untuk transisi satu kali ini.

## Setelah selesai

- Update `docs/roadmap.md` Risk #2 jadi **Fixed** dengan referensi commit.
- Hapus/update bagian "Rencana ke depan" di `README.md` bagian Backup & Rollback
  (sudah tidak relevan begitu `migrate deploy` terpasang).
