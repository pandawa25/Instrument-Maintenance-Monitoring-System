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
- [ ] Deployment ke Railway (production — trial deploy sudah berjalan end-to-end)
