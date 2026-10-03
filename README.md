# Instrument Maintenance Monitoring System

Aplikasi web untuk monitoring dan pengelolaan maintenance peralatan instrumentasi pada fasilitas industri (refinery, terminal BBM, depot, plant process, fasilitas energi).

MVP mencakup 3 modul: **Master Area**, **Master Instrument**, **Corrective Maintenance**, plus dashboard ringkas. Desain lengkap (ERD, rationale, wireframe) ada di `docs/`.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT |
| Deployment | Railway.app, Docker |
| API Docs | Swagger (`/api/docs`) |

## Struktur Repo

```
instrument-maintenance-system/
├── apps/
│   ├── frontend/         # React + Vite
│   └── backend/          # NestJS
├── packages/
│   ├── shared-types/     # enum & DTO shape dipakai FE + BE
│   └── shared-utils/     # helper murni, dipakai FE + BE
├── docs/                 # design docs
├── database/             # ERD, catatan schema
├── docker/                # Dockerfile FE/BE, compose
└── .github/workflows/     # CI
```

## Menjalankan Secara Lokal

### 1. Persiapan

```bash
cp .env.example .env
# isi DATABASE_URL, JWT_SECRET sesuai environment lokal
npm install
```

### 2. Database (via Docker)

```bash
docker compose -f docker/docker-compose.yml up -d db
```

### 3. Migration & Seed

File migration formal ada di `apps/backend/prisma/migrations/` (14 migration, mulai
`20260928000000_init` sampai perubahan terbaru) dan production di-deploy lewat
`prisma migrate deploy` (lihat `docker/Dockerfile.backend` CMD) — bukan lagi `db push`.
Untuk setup lokal:

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 4. Jalankan aplikasi

```bash
npm run dev:backend    # http://localhost:3000  (Swagger: /api/docs)
npm run dev:frontend   # http://localhost:5173
```

### Full stack via Docker Compose

```bash
docker compose -f docker/docker-compose.yml up --build
```

### Lampiran Evidence (Attachment)

Foto/PDF evidence Corrective Maintenance & PM Execution disimpan sebagai file di
disk (`UPLOAD_DIR`, default `./uploads`), bukan di database. Di Railway, **wajib**
tambahkan [Volume](https://docs.railway.app/reference/volumes) yang di-mount ke
path yang sama dengan `UPLOAD_DIR` (mis. `/data/uploads`) — tanpa Volume, semua
file lampiran akan hilang setiap kali service di-redeploy (filesystem container
Railway bersifat ephemeral).

## Default Login (hasil seed)

| Email | Password | Role |
|---|---|---|
| admin@imms.local | Admin123! | Admin |

> Ganti password ini segera setelah environment production pertama kali dijalankan —
> login sebagai Admin, buka menu **User Management**, lalu gunakan aksi "Reset Password"
> pada akun admin@imms.local.

## Backup & Rollback Database (Railway / PostgreSQL)

Deployment sejak 3 Okt 2026 pakai `prisma migrate deploy` di startup container
(lihat `docker/Dockerfile.backend`) — bukan lagi `db push`. Ini menjalankan file
migration formal di `prisma/migrations/` secara berurutan, dengan riwayat yang bisa
di-review seperti code review biasa. **Tapi** rollback container ke image lama
(mis. lewat Railway "Redeploy" versi sebelumnya) **tetap TIDAK otomatis mengembalikan
schema database** — `migrate deploy` hanya maju (apply migration baru), tidak ada
"migrate down" otomatis. Kalau deploy baru menghapus/ubah kolom, rollback container
tanpa rollback database akan membuat kode lama error (kolom yang diharapkan sudah
tidak ada) atau diam-diam kehilangan data.

### Backup — wajib sebelum deploy yang mengubah schema

Railway PostgreSQL punya backup otomatis bawaan (tergantung plan — cek
[dokumentasi Railway](https://docs.railway.app/reference/backups) untuk retensi
yang berlaku di plan yang dipakai), tapi untuk perubahan schema yang berisiko
(mengubah tipe kolom, menghapus kolom/tabel, mengubah constraint), **jangan
bergantung pada backup otomatis saja** — ambil backup manual tepat sebelum deploy:

```bash
# Dari komputer dengan akses ke DATABASE_URL Railway (lihat tab "Variables" project):
pg_dump "$DATABASE_URL" -F c -f "backup-$(date +%Y%m%d-%H%M%S).dump"

# Restore kalau diperlukan (ke database yang SAMA, menimpa isi saat ini):
pg_restore --clean --if-exists -d "$DATABASE_URL" backup-20261003-120000.dump
```

Simpan file dump di luar Railway (lokal/Google Drive/S3) — jangan commit ke git
(data produksi, dan ukuran bisa besar).

### Prosedur rollback kalau deploy baru bermasalah

1. **Container-only rollback (schema TIDAK berubah di deploy yang bermasalah)** —
   aman langsung: di Railway dashboard, pilih deployment sebelumnya → "Redeploy".
2. **Schema berubah di deploy yang bermasalah** — rollback container saja TIDAK
   CUKUP:
   - Kalau kolom/tabel baru ditambahkan (tidak ada yang dihapus): rollback
     container aman — kolom baru yang tidak dipakai kode lama tidak masalah,
     dibiarkan saja sampai deploy berikutnya.
   - Kalau kolom/tabel **dihapus atau diubah tipe/constraint-nya**: restore
     database dari backup manual (langkah di atas) **sebelum** atau **bersamaan
     dengan** rollback container — urutan: stop traffic (atau terima downtime
     singkat) → `pg_restore` → rollback container → verifikasi.
3. Setelah rollback, jalankan smoke test manual: login, buka 1 halaman per modul
   (Area/Equipment/Corrective Maintenance/Dashboard), pastikan tidak ada error di
   Railway logs.

## Konvensi Commit

Menggunakan [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: tambah module corrective maintenance
fix: perbaiki validasi tag_number
refactor: pindahkan query filter ke repository
docs: update ERD
chore: update dependency
```

## Status Pengembangan

- [x] Design phase — ERD, Prisma schema, struktur folder, wireframe (`docs/design-document.md`)
- [x] Project scaffolding
- [x] Auth (JWT)
- [x] Module Area (backend + frontend) — pattern acuan modul lain
- [x] Module Instrument (backend + frontend) — termasuk master Instrument Type (read-only)
- [x] Module Corrective Maintenance (backend + frontend) — termasuk lookup Technician (`GET /users`, read-only)
- [x] Dashboard — summary cards, chart maintenance per bulan/area/failure category (Recharts), tabel 10 maintenance terbaru
- [x] Module Manage User (backend + frontend, Admin only) — CRUD user, assign role, reset password; proteksi self-lockout (tidak bisa nonaktifkan/hapus akun sendiri)
- [x] Module Spare Part / Material + integrasi kebutuhan material di Corrective Maintenance
- [x] Stock Movement Ledger (Phase 2) — audit trail lengkap perubahan stock, restock/adjustment manual
- [x] Attachment / Evidence Upload (Phase 2) — lampiran foto/PDF untuk Corrective Maintenance & PM Execution
- [x] Refresh Token & Session Hardening (Phase 2) — access token 15m, refresh token opaque via httpOnly cookie dengan rotation + reuse detection, login history
- [x] Automated Testing Baseline (Phase 2) — Jest unit test untuk logika kritis (auth, RBAC, stock ledger), dijalankan otomatis di CI
- [x] Audit Log Terpusat (Phase 2) — jejak siapa/apa/kapan untuk semua mutasi create/update/delete di seluruh modul CRUD
- [x] Referensi Notifikasi/Work Order ERP & Multi-Technician (Phase 3a) — field referensi manual dari ERP di Corrective Maintenance & PM Period Execution, plus technician tambahan di Corrective Maintenance
- [x] KPI Dashboard (Phase 3b) — MTTR, MTBF, PM Compliance Rate: overall, per Area, per Instrument, dengan filter rentang bulan
- [x] Instrument Health Index (Phase 3c) — skor komposit 0-100 per instrument dari MTTR/MTBF/failure frequency (percentile relatif antar instrument) + penyesuaian criticality
- [x] UI/UX Refresh — Foundation (Phase 4a) — design token CSS-variable + dark mode, sidebar collapsible, avatar dropdown menu, toast notification, redesign halaman Login
- [x] UI/UX Refresh — Rollout ke seluruh modul (Phase 4b) — PageHeader/EmptyState/LoadingState konsisten + toast notification di semua form, diterapkan ke 9 modul (Area, Equipment, Instrument Name, Vendor, PM Activity Type, Spare Part, Corrective Maintenance, PM Programs, User Management)
- [ ] Deployment ke Railway (production — trial deploy sudah berjalan end-to-end)

### Refresh Token & Session Hardening

- Access token JWT (15 menit, `JWT_EXPIRES_IN`) tetap dikirim di response body & dipakai lewat header `Authorization: Bearer`.
- Refresh token **opaque** (bukan JWT, random 64-byte hex), disimpan di DB hanya dalam bentuk hash SHA-256, dikirim ke client lewat cookie `httpOnly` (`imms_refresh_token`, scope path `/api/auth`, `expires` sesuai `JWT_REFRESH_EXPIRES_IN` default 7 hari).
- Setiap `POST /auth/refresh` melakukan **rotation**: token lama langsung di-revoke, token baru diterbitkan — sekali pakai per token.
- **Reuse detection**: kalau refresh token yang sudah pernah di-revoke dipakai lagi (indikasi dicuri/replay), seluruh refresh token milik user tersebut langsung dicabut, memaksa login ulang di semua device.
- `COOKIE_SECURE` mengikuti `NODE_ENV` (production = `true`, otomatis `Secure` + `SameSite=None`, dibutuhkan karena frontend & backend beda subdomain di Railway). Untuk docker-compose lokal (HTTP, bukan HTTPS) di-override eksplisit `COOKIE_SECURE=false` supaya cookie tetap terkirim.
- `CORS_ORIGIN` di backend **wajib** diisi origin frontend yang eksak (bukan `*`) — browser menolak cookie cross-origin kalau `Access-Control-Allow-Origin` wildcard sementara `credentials: true`.
- Login history (tabel `login_history`) mencatat sukses & gagal, **hanya untuk email yang terdaftar** (email yang sama sekali tidak ada di sistem tidak dicatat, menghindari noise dari salah ketik/bot scan).
- Belum ada UI admin untuk browse/revoke session aktif — baru kemampuan backend (rotation otomatis + revoke saat logout).

### Automated Testing Baseline

- Framework: Jest + ts-jest (backend). Jalankan lokal dengan `npm test --workspace=apps/backend`.
- Scope MVP: unit test untuk logika bisnis/security paling berisiko kalau salah, bukan coverage menyeluruh semua modul:
  - `AuthService` — login tidak mencatat history untuk email tak terdaftar, bcrypt tetap jalan untuk akun nonaktif (timing-safe), refresh token rotation, reuse detection (token bekas dipakai lagi → semua sesi dicabut), logout.
  - `RolesGuard` — enforcement RBAC (Admin vs Viewer, endpoint tanpa `@Roles(...)`).
  - `SparePartsRepository.recordMovement` — satu-satunya jalur mutasi stock: penambahan/pengurangan benar, validasi stock tidak boleh negatif, spare part tidak ditemukan.
- Semua test memakai mock (Prisma, bcrypt, JwtService) — tidak butuh database sungguhan, cepat dijalankan di CI.
- Terpasang sebagai step di `.github/workflows/ci.yml` (job `backend`) — PR/push ke `main`/`develop` otomatis gagal kalau ada test yang merah.
- Belum ada e2e test (butuh test database) maupun test frontend (Vitest) — menyusul di iterasi berikutnya sesuai kebutuhan.

### Audit Log Terpusat

- Mekanisme: 1 interceptor global (`AuditLogInterceptor`, didaftarkan di `main.ts`) yang aktif hanya untuk endpoint yang eksplisit ditandai `@AuditLog('EntityName')` — bukan Prisma middleware yang mencatat SEMUA query (termasuk yang tidak relevan, mis. update `lastLoginAt` saat login), dan bukan pula kode manual di tiap service (lebih rapi & tidak berulang, cukup 1 baris decorator per endpoint controller).
- Action (`CREATE`/`UPDATE`/`DELETE`) diturunkan otomatis dari HTTP method (POST/PATCH-PUT/DELETE) — tidak perlu disebutkan manual.
- Yang dicatat per baris: `userId` (dari JWT, endpoint yang diaudit selalu di belakang `JwtAuthGuard`), `action`, `entityType`, `entityId` (dari `:id` di URL atau dari `id` hasil response untuk `create`), `payload` (snapshot request body — **bukan** before/after diff, lihat catatan desain di bawah), `ipAddress`, `userAgent`, `createdAt`.
- **Redaksi otomatis**: field yang namanya mengandung `password`/`token`/`secret` (case-insensitive, rekursif ke object/array bersarang) diganti `[REDACTED]` sebelum disimpan — lihat `common/utils/redact-sensitive.util.ts`. Penting untuk endpoint seperti reset password user (`PATCH /users/admin/:id/password`) yang body-nya berisi password baru.
- **Cakupan**: semua modul CRUD — Area, Equipment (Instrument), Corrective Maintenance, Spare Part, Vendor, PM Program/Period/Period Execution, PM Activity Type, Instrument Name, Manage User, Attachment. **Sengaja tidak** mencakup: `/auth/*` (sudah punya `login_history` sendiri, lebih relevan untuk percobaan login), dan `POST /spare-parts/:id/stock-movements` (sudah punya `SparePartStockMovement` ledger sendiri yang lebih detail — quantityDelta, balanceAfter, type — mencatat lagi ke audit_logs generik hanya duplikasi yang membingungkan).
- **Keputusan desain (MVP)**: snapshot body, bukan before/after diff — cukup untuk jejak "siapa mengubah apa kapan" tanpa menambah 1 query baca sebelum tiap mutasi. Diff lengkap bisa menyusul kalau kebutuhan investigasi butuh nilai SEBELUM perubahan.
- Kegagalan menulis audit log **tidak pernah menggagalkan request aslinya** — di-catch & di-log lewat `Logger` saja (best-effort/observability, bukan bagian alur bisnis inti).
- Tabel `audit_logs` sengaja **tidak** memakai pola `updated_at`/`deleted_at` standar tabel lain — log bersifat append-only/immutable, tidak pernah diupdate atau di-soft-delete.
- Belum ada UI untuk melihat audit log — data bisa dicek lewat Prisma Studio / query langsung untuk saat ini (konsisten dengan keputusan session management sebelumnya: backend dulu, UI menyusul kalau dibutuhkan).

### Referensi Notifikasi/Work Order ERP & Multi-Technician

- **Keputusan desain (penting)**: ini **bukan** sistem Work Order internal (tidak ada entity `WorkOrder`, tidak ada workflow approval/assignment di dalam aplikasi). Work Order di lapangan diterbitkan dari sistem ERP eksternal (mis. SAP PM, dengan alur Notification → Work Order) — aplikasi ini hanya menyediakan field referensi yang **diisi manual** setelah Notifikasi/WO diterbitkan di ERP, sebagai jejak dokumentasi.
- Field baru di **Corrective Maintenance**: `notificationNumber`, `notificationDate`, `notificationStatus`, `workOrderNumber`, `workOrderDate`, `workOrderStatus` — semua opsional & free-text (bukan enum/dropdown), karena vocabulary status ERP bervariasi antar implementasi dan Notifikasi/WO mungkin belum ada saat CM pertama kali dicatat.
- Field baru di **PM Period Execution**: `workOrderNumber`, `workOrderDate`, `workOrderStatus` saja (tidak ada Notification — PM terjadwal, bukan by-exception seperti CM).
- **Multi-technician** (Corrective Maintenance saja): tabel baru `corrective_maintenance_technicians` (many-to-many ke `users`) untuk technician **tambahan**. Field `technicianId` yang sudah ada tetap sebagai "technician utama" (PIC) — tidak breaking untuk laporan/filter yang sudah keyed ke `technicianId`. PM Period Execution tidak diubah untuk multi-technician — tetap pakai field free-text `vendorPersonnel` yang sudah ada, karena biasanya PM dikerjakan vendor eksternal, bukan technician internal terdaftar.
- Update `additionalTechnicianIds` di backend pakai pola **replace-all** (hapus semua baris lama, insert ulang daftar baru) — sama seperti pola `materials` di Corrective Maintenance, konsisten dan sederhana untuk skala tim kecil (<20 user).
- Belum ada kolom Work Order di tabel list (Maintenance List / PM Execution List) — info ini hanya tampil di form edit & detail dialog untuk menjaga tabel tetap ringkas; bisa ditambahkan sebagai kolom opsional kalau kebutuhan filter/reporting berdasarkan WO muncul nanti.

### KPI Dashboard

- **Definisi & rumus:**
  - **MTTR** (Mean Time To Repair) = rata-rata `downtimeHours` dari seluruh Corrective Maintenance berstatus `COMPLETED` dalam periode. Kejadian tanpa `downtimeHours` (null) diabaikan dari perhitungan, bukan dianggap 0.
  - **MTBF** (Mean Time Between Failures) = rata-rata interval **hari kalender** antar kejadian gagal berurutan per equipment. **Catatan penting**: ini calendar-based, bukan operating-hours-based (running hours meter belum ditrack di sistem) — jadi MTBF di sini mengukur "seberapa sering equipment gagal secara kalender", bukan MTBF klasik berbasis jam operasi. Equipment dengan <2 kejadian gagal dalam periode menghasilkan MTBF `null` (belum bisa dihitung), bukan 0.
  - **PM Compliance Rate** = `COMPLETED` / total `PmPeriodExecution` yang dijadwalkan (berdasarkan `plannedDate` periode) dalam periode, dikali 100%.
- **Level agregasi**: Overall (seluruh plant), per Area, per Instrument (Tag Number) — dihitung dalam satu request yang sama (bukan 3 endpoint terpisah), lalu di-drill-down di frontend.
- **Rentang waktu**: trailing N bulan dari hari ini (pilihan 3/6/12/24 bulan di UI, default 12). Filter ini menentukan kejadian gagal & PM mana saja yang dihitung — bukan filter tampilan setelah data diambil.
- **Pendekatan implementasi**: dihitung **on-the-fly** di `DashboardService.getKpi()` (agregasi di JS setelah 2 query Prisma) — bukan tabel agregat/materialized view maupun scheduled job. Cukup untuk skala 1 plant/<20 user; kalau dataset membesar signifikan, ini adalah titik pertama yang perlu dioptimasi (mis. pindah ke SQL `GROUP BY` langsung atau pre-agregasi berkala).
- Endpoint: `GET /dashboard/kpi?months=12` — ditempatkan sebagai section baru di halaman Dashboard yang sudah ada (bukan menu/halaman terpisah), di bawah chart & tabel recent yang sudah ada.
- Tabel "KPI per Instrument" punya search box client-side (filter by Tag Number/service) karena datanya bisa banyak baris — tidak ada pagination server-side untuk endpoint ini (dianggap cukup untuk skala saat ini, seluruh instrument dikirim sekaligus).
- Unit test (`dashboard.service.spec.ts`) mencakup: perhitungan MTTR dengan/tanpa data null, MTBF dengan multiple interval, MTBF null untuk data <2 titik, PM compliance rate, pengelompokan per Area/Instrument terpisah dari overall, dan default rentang 12 bulan.

### Instrument Health Index

- **Formula**: skor 0-100 per instrument, dihitung dari 3 komponen yang dinormalisasi ke **percentile relatif antar instrument di plant yang sama** (bukan threshold absolut — belum ada angka acuan industri untuk plant ini):
  - MTTR (bobot 35%) — makin rendah dari peer, skor makin tinggi
  - MTBF (bobot 35%) — makin tinggi dari peer, skor makin tinggi
  - Failure frequency / jumlah kejadian gagal (bobot 30%) — makin sedikit dari peer, skor makin tinggi
  - Kalau MTBF tidak bisa dihitung (equipment cuma punya 1 kejadian gagal dalam periode), bobotnya didistribusikan ulang ke 2 komponen lain — bukan dianggap 0.
- **Penyesuaian Criticality**: criticality **bukan** komponen skor terpisah, tapi pengali terhadap "kekurangan" (100 − base score) — instrument `HIGH` criticality kekurangannya dikalikan 1.2x (diperberat), `MEDIUM` 1.0x (netral), `LOW` 0.8x (diperingan). Efeknya: 2 instrument dengan reliability performance identik akan punya Health Score akhir berbeda — yang `HIGH` criticality akan terlihat lebih mendesak (skor lebih rendah).
- **Equipment tanpa riwayat corrective maintenance dalam periode** = kategori `INSUFFICIENT_DATA`, **bukan** otomatis diberi skor tinggi — supaya instrument yang jarang dicek tidak disalahartikan sebagai instrument yang reliable (sesuai keputusan desain, karena data satu-satunya sumber "kesehatan" saat ini adalah riwayat corrective maintenance).
- **Kategori**: `GOOD` (≥85), `FAIR` (70-84), `POOR` (50-69), `CRITICAL` (<50), `INSUFFICIENT_DATA` (tidak dihitung).
- Endpoint: `GET /dashboard/health-index?months=12` — daftar diurutkan skor terendah dulu (paling mendesak di atas), plus ringkasan jumlah instrument per kategori.
- **Keterbatasan yang disadari**: karena berbasis percentile relatif, skor akan bergeser kalau komposisi/jumlah instrument yang discoring berubah signifikan (mis. baru pertama kali dipakai dengan data sedikit) — ini bukan skor absolut yang bisa dibandingkan lintas periode/plant tanpa konteks. Cukup untuk MVP prioritisasi internal, belum untuk benchmarking eksternal.
- 4 unit test baru mencakup: instrument tanpa riwayat → INSUFFICIENT_DATA, instrument performa buruk mendapat skor lebih rendah dari peer, criticality HIGH memperberat skor dibanding LOW untuk data identik, dan threshold kategori.

### UI/UX Refresh — Foundation (Phase 4a)

Rollout dikerjakan bertahap: tahap ini membangun fondasi (design system, layout, halaman Login) yang otomatis berlaku ke seluruh app; tahap berikutnya (Phase 4b) menerapkan polish visual per-modul (Area/Instrument/CM/PM/Vendor/dll) setelah fondasi ini direview.

- **Design token → CSS variable**: warna (`primary`, `secondary`, `success`, `warning`, `danger`, `border`, `surface`, `background`, `text`, dll) di `tailwind.config.js` sekarang membaca dari CSS variable HSL (`hsl(var(--x) / <alpha-value>)`) yang didefinisikan di `index.css` (`:root` untuk light, `.dark` untuk dark) — **bukan hex literal langsung seperti sebelumnya**. Efeknya: hampir seluruh halaman existing otomatis dapat dark mode tanpa perlu diubah satu-satu, karena komponen sudah konsisten memakai nama class semantik (`bg-surface`, `text-text-muted`, dst), bukan warna mentah.
- **Dark mode**: toggle sungguhan (bukan cuma disiapkan) — state disimpan di `theme.store.ts` (zustand + persist, key `imms-theme`), class `dark` di-toggle di `<html>`. Ada inline script kecil di `index.html` yang membaca localStorage SEBELUM React mount, supaya tidak ada flash light→dark saat reload halaman.
- **Sidebar collapsible**: bisa diciutkan jadi icon-only (state persisted di `layout-preferences.store.ts`), dengan tooltip nama menu saat hover dalam kondisi collapsed (Radix Tooltip, `components/ui/tooltip.tsx`).
- **Avatar dropdown menu**: tombol logout polos di header diganti dropdown (Radix DropdownMenu, `components/ui/dropdown-menu.tsx`) berisi info akun (nama, email) dan logout — juga jadi tempat theme toggle di layar sempit.
- **Toast notification**: pakai `sonner` (dipasang global di `App.tsx`). Untuk fondasi ini baru dipasang di 2 titik yang sebelumnya tidak ada feedback ke user sama sekali: error network/server tidak terjangkau, dan notifikasi sesi berakhir (dari `lib/axios.ts` interceptor) — konversi form-error existing (inline text → toast) menyusul per-modul di Phase 4b, tidak diborongkan di sini supaya perubahan tetap bisa direview bertahap.
- **Halaman Login**: didesain ulang jadi split-panel — panel kiri brand (gradient primary, pola SVG abstrak garis/instrument loop buatan sendiri, highlight fitur) hanya tampil di layar lebar (`lg:`), panel kanan form dengan password show/hide toggle dan error via toast (bukan lagi teks statis).
- **Dashboard charts**: `dashboard-charts.tsx` sebelumnya pakai hex warna literal (tidak ikut dark mode) — sekarang baca warna lewat hook `use-chart-colors.ts` yang resolve CSS variable saat itu juga (Recharts butuh string warna literal, tidak bisa pakai class Tailwind langsung).
- **Dependency baru**: `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `sonner`.
- **Belum dikerjakan di Phase 4a** (dikerjakan di Phase 4b): polish visual per-modul, konversi sisa form-error inline ke toast — lihat bagian Phase 4b di bawah.

### UI/UX Refresh — Rollout ke Seluruh Modul (Phase 4b)

Melanjutkan Phase 4a dengan menerapkan 3 komponen shared baru secara konsisten ke 9 modul (Area, Equipment, Instrument Name, Vendor, PM Activity Type, Spare Part, Corrective Maintenance, PM Programs — termasuk halaman detailnya, User Management):

- **`components/shared/page-header.tsx`** (`PageHeader`) — menggantikan blok header (judul + deskripsi + tombol create) yang sebelumnya di-copy-paste manual dan identik di tiap list page. Sekarang setiap modul punya icon representatif di header (mis. Equipment → `Gauge`, Vendor → `Building2`, Corrective Maintenance → `Wrench`), sama dengan icon di sidebar supaya konsisten.
- **`components/shared/empty-state.tsx`** / **`loading-state.tsx`** — menggantikan teks polos "Memuat data..."/"Belum ada data..." yang sebelumnya ditulis ulang di tiap komponen Table, sekarang pakai icon + spinner yang konsisten.
- **Toast menggantikan inline error text** di semua form dialog single-record (create/update): `const [error, setError] = useState(...)` dan `{error && <p>...}</p>}` dihapus total, diganti `toast.error(...)` (`sonner`, sudah dipasang global sejak Phase 4a) — plus **toast sukses baru** yang sebelumnya tidak ada sama sekali (dialog cuma menutup diam-diam setelah create/update/delete berhasil, sekarang ada konfirmasi eksplisit "X berhasil ditambahkan/diperbarui/dihapus").
- **Pengecualian yang disengaja — dialog multi-step tetap pakai inline error di step tertentu**: `equipment-bulk-upload-dialog.tsx` (upload→preview→commit) dan pola serupa — error dari tahap **parsing/preview awal** tetap ditampilkan inline (user perlu melihatnya sambil membaca preview data dan memperbaiki file), sementara error dari **commit/submit final** dikonversi ke toast. Ini keputusan sadar, bukan kelalaian: toast otomatis hilang dan tidak cocok untuk error yang perlu terus terlihat selagi user bekerja di dalam dialog yang sama.
- **`pm-program-detail-page.tsx`** — satu-satunya halaman detail yang bukan dialog (punya route sendiri `/pm-programs/:id`) — diberi `PageHeader` yang sama (title = nama program, description = ringkasan vendor/frekuensi/tanggal mulai, action = status badge), summary stat card di bawahnya dipisah dari header supaya tidak tercampur.
- **Tidak ada perubahan logika bisnis/validasi/struktur data** — murni lapisan presentasi. Verifikasi: `tsc --noEmit` bersih di semua modul, `npm run build` frontend clean, backend test tetap 45/45 (tidak disentuh).
