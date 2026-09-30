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

> **Catatan**: file migration formal (`prisma/migrations/`) belum ada di repo ini —
> environment development awal terblokir akses ke `binaries.prisma.sh` sehingga
> `prisma migrate dev` belum sempat dijalankan. Jalankan sekali di komputer dengan
> akses internet penuh, lalu commit folder `prisma/migrations/` yang dihasilkan:
> ```bash
> npx prisma migrate dev --name init --schema=apps/backend/prisma/schema.prisma
> ```
> Sebelum itu ada, deployment (termasuk Docker) memakai `prisma db push` sebagai
> pengganti sementara — lihat komentar di `docker/Dockerfile.backend`.

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
