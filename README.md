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

> Ganti password ini segera setelah environment production pertama kali dijalankan.

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
- [ ] Module Instrument
- [ ] Module Corrective Maintenance
- [ ] Dashboard
- [ ] Deployment ke Railway
