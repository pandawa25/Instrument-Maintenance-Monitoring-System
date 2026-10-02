# System Audit — Instrument Maintenance Monitoring System
**Tanggal:** 3 Oktober 2026
**Scope:** Backend (NestJS), Frontend (React), DevOps/Deployment & Database Schema
**Metode:** Code review menyeluruh (read-only), tidak ada perubahan kode dalam audit ini

---

## Ringkasan Eksekutif

Codebase secara umum **solid untuk tahap MVP** — RBAC konsisten, parameterized query, soft-delete pattern rapi, refresh-token rotation sudah benar. Temuan di bawah adalah celah konkret yang perlu diprioritaskan sebelum sistem ini menangani data produksi nyata di fasilitas (refinery/terminal/plant), terutama karena konteksnya industri migas/energi dengan implikasi keselamatan & finansial pada data inventory/maintenance.

**4 isu Critical/High yang berdampak langsung ke keamanan atau operasional:**

| # | Temuan | Dampak | Area |
|---|--------|--------|------|
| 1 | `JWT_SECRET` fallback hardcoded tanpa validasi startup | Attacker bisa forge token ber-role apapun kalau env var lupa di-set | Security (Backend) |
| 2 | Tidak ada rate limiting di `/auth/login` | Brute-force password tanpa batas | Security (Backend) |
| 3 | Access token JWT disimpan di `localStorage` | Exposure penuh token kalau ada XSS | Security (Frontend) |
| 4 | Container jalan sebagai root (tanpa `USER` di Dockerfile) | Blast radius lebih besar kalau ada RCE | DevOps |

Detail lengkap dan rekomendasi per kategori ada di bawah.

---

## 1. SECURITY

### Backend

| Severity | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|
| 🔴 High | `JWT_SECRET` fallback ke string hardcoded (`'dev_secret_change_me'`) tanpa validasi saat boot | `apps/backend/src/config/app.config.ts:6` | Validasi env wajib di `ConfigModule.forRoot({ validationSchema })` (Joi/class-validator) — `throw` kalau `JWT_SECRET` tidak di-set atau terlalu pendek saat `NODE_ENV=production` |
| 🔴 High | Tidak ada rate limiting di endpoint login/refresh | `apps/backend/src/modules/auth/auth.controller.ts` | Pasang `@nestjs/throttler`, limit lebih ketat khusus `/auth/login` (mis. 5 req/menit/IP) |
| 🟡 Medium | `sortBy` dari query param dipakai langsung sebagai Prisma `orderBy` key tanpa whitelist | `common/dto/pagination-query.dto.ts:31-34`, dipakai di ≥10 repository | Tambah `@IsIn([...allowedColumns])` per-DTO, bukan `@IsString()` generik |
| 🟡 Medium | `GlobalExceptionFilter` mengembalikan `exception.message` mentah untuk error non-Prisma-known (termasuk `PrismaClientValidationError` dari poin di atas) — bocorkan detail skema DB ke client | `common/filters/global-exception.filter.ts:47-50` | Untuk cabang `instanceof Error` yang tidak dikenali, return pesan generik ke client; detail asli cukup di log |
| 🟢 Low | Cookie refresh token `sameSite: 'lax'`, bukan `strict` | auth config | Risiko kecil (scoped ke POST), tidak mendesak |

**Sudah baik (dikonfirmasi, bukan temuan):** RBAC (`@Roles()`) konsisten di semua controller sensitif; semua `$queryRaw` pakai tagged template (aman dari SQL injection); `passwordHash` tidak pernah ikut ter-return (select eksplisit); file upload sudah validasi MIME+size+filename randomized; bcrypt rounds=10 wajar.

### Frontend

| Severity | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|
| 🔴 High | Access token JWT disimpan di `localStorage` via Zustand persist — rawan dibaca kalau ada XSS | `src/store/auth.store.ts:21-32` | Simpan access token di memory saja (state tanpa persist); pakai cookie httpOnly refresh token + panggil `/auth/refresh` sekali saat app mount untuk re-hydrate. Infrastruktur refresh sudah ada di `axios.ts:44-58`, tinggal dipanggil di startup |

**Dikonfirmasi aman:** tidak ada `dangerouslySetInnerHTML` di seluruh frontend; role-check di UI memang cuma cosmetic (backend yang enforce) — sesuai desain yang benar.

### Fungsi/Correctness (berkaitan keamanan data)

| Severity | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|
| 🔴 High | Tidak ada validasi state-machine untuk `MaintenanceStatus` — client bisa kirim transisi status bebas (mis. `COMPLETED` → `OPEN`), dan `completionDate` tidak wajib saat status `COMPLETED` | `maintenance.service.ts:143-159`, `dto/create-maintenance.dto.ts:93-96` | Tambah validator transisi status yang diizinkan per status saat ini + requirement conditional untuk `completionDate` |
| 🟡 Medium | Race condition di pencatatan stock movement — tidak ada row lock (`SELECT ... FOR UPDATE`) | `spare-parts.repository.ts:119-157` (sudah diakui di komentar kode) | Sebelum multi-user concurrent jadi nyata: pakai row lock atau optimistic locking (`version` column) |
| 🟢 Low | File upload: validasi tipe file cuma dari `mimetype` klaim client (bisa dipalsukan) | `attachments.multer.config.ts:42-48` | Defense-in-depth: cek magic bytes (`file-type` package) |

---

## 2. PERFORMANCE

| Severity | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|
| 🔴 High | **Tidak ada debounce di semua input pencarian** — tiap keystroke memicu request API baru, dipakai di 22 list page | `src/components/shared/search-input.tsx:10-22` | Buat `useDebouncedValue(value, 300)`, terapkan di `SearchInput` |
| 🟡 Medium | N+1 query backend saat validasi material/technician tambahan di Corrective Maintenance (1 query per item, bukan batch) | `maintenance.service.ts:78-87, 112-117` | Ganti jadi `findMany({ where: { id: { in: [...] } } })` sekali, bandingkan jumlah hasil |
| 🟡 Medium | N+1 **request** dari frontend saat "Isi Massal" PM Execution — satu PUT per equipment terpilih, paralel | `pm-bulk-execution-form-dialog.tsx:99-123` | Sediakan endpoint bulk-update tunggal di backend |
| 🟡 Medium | Dashboard memicu 5+ query paralel independen tanpa agregasi | `dashboard-page.tsx:13-16`, dst | Kandidat konsolidasi endpoint ke depan (belum mendesak untuk MVP) |
| 🟢 Low | Tidak ada composite index `(spare_part_id, created_at)` untuk histori stock movement | `schema.prisma:504` | Ubah `@@index([sparePartId])` → `@@index([sparePartId, createdAt])` |
| 🟢 Low | Tidak ada code-splitting/lazy loading route — semua 15+ halaman (termasuk recharts) di-bundle sekaligus | `src/app/router.tsx` | `React.lazy()` + `<Suspense>` minimal untuk Dashboard, Maintenance, PM Programs |

---

## 3. CODE QUALITY

| Severity | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|
| 🟡 High | Duplikasi pola form-dialog identik di 10+ modul (state sync, submit, error handling) — tidak ada hook bersama | `*/components/*-form-dialog.tsx` | Buat `useCrudFormDialog()` generik: `{ form, setForm, handleSubmit, isSaving }` |
| 🟡 High | **Tidak ada Error Boundary** sama sekali — satu error render bisa membuat seluruh app blank | `src/main.tsx`, `src/app/App.tsx` | Tambah `ErrorBoundary` global dengan fallback UI, idealnya juga per-route/per-chart |
| 🟡 Medium | Duplikasi pola `orderBy: { [query.sortBy]: query.sortOrder }` di 10+ repository (terkait juga temuan security di atas) | — | Factor jadi helper bersama `buildSafeOrderBy()` |
| 🟡 Medium | File form monolitik 300-500 baris tanpa dipecah sub-komponen | `maintenance-form-dialog.tsx` (512 baris), `equipment-form-dialog.tsx` (400 baris), dll | Pecah section besar (material rows, ERP block, checklist) jadi sub-komponen |
| 🟢 Low | `tx: any` di beberapa repository, `row: any` di beberapa service — hilang type-safety Prisma | `spare-parts.repository.ts:89,129,160`, `maintenance.repository.ts:124`, `pm-period-executions.service.ts:9,23` | Ketik sebagai `Prisma.TransactionClient` |
| 🟢 Low | `catch (err: any)` di 27 file (sudah terisolasi lewat `getErrorMessage`, tapi bisa dirapikan ke `unknown`) | — | Ganti signature `getErrorMessage` terima `unknown` |

---

## 4. UI/UX

| Severity | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|
| 🔴 High | `SearchableSelect` **tidak bisa dioperasikan tanpa mouse** — tanpa `role="combobox"`, tanpa keyboard nav (Arrow/Enter), tombol clear malah `tabIndex={-1}` (dihapus dari tab order) | `src/components/shared/searchable-select.tsx:75-144` | Tambah `role="combobox"` + `aria-expanded`, dukung Arrow Up/Down/Enter/Escape, ganti clear-button jadi `<button tabIndex={0}>` |
| 🟡 Medium | Bulk PM execution: `Promise.all` pada partial failure langsung reject tanpa rollback/indikasi mana yang gagal — user tidak tahu equipment mana yang sudah tersimpan vs belum | `pm-bulk-execution-form-dialog.tsx:99-123` | Ganti `Promise.allSettled`, tampilkan ringkasan "X berhasil, Y gagal" + daftar yang gagal |
| 🟡 Medium | Dialog tanpa `DialogDescription` — Radix warning aksesibilitas, screen reader tidak dapat konteks | `components/ui/dialog.tsx`, semua form dialog | Tambah `DialogDescription` (boleh visually-hidden) |
| 🟢 Low | Inkonsistensi `<select>` native vs komponen `<Select>` shadcn di halaman dashboard yang sama | `health-index-section.tsx:64-74` vs `kpi-section.tsx:179` | Samakan ke komponen `<Select>` |

---

## 5. DEVOPS / DEPLOYMENT

| Severity | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|
| 🔴 High | Container backend & frontend (nginx) jalan sebagai **root** — tidak ada instruksi `USER` | `docker/Dockerfile.backend`, `docker/Dockerfile.frontend` | Tambah `USER node` (backend) / `USER nginx` (frontend) sebelum `CMD` |
| 🔴 High | Tidak ada strategi rollback schema terdokumentasi — karena pakai `db push`, rollback container ke image lama tidak otomatis mengembalikan kolom yang **dihapus** oleh deploy baru | README/runbook | Dokumentasikan prosedur backup manual sebelum deploy yang mengubah schema |
| 🟡 Medium | Tidak ada `HEALTHCHECK`/endpoint health sama sekali | Dockerfile, backend routes | Tambah `GET /api/health` (cek DB via `$queryRaw`) + `HEALTHCHECK CMD` di Dockerfile |
| 🟡 Medium | Tidak ada strategi backup database yang disebutkan di mana pun | README, docker-compose | Dokumentasikan backup bawaan Railway Postgres, atau cron `pg_dump` |
| 🟡 Medium | Logging masih `console.log` polos, bukan structured (JSON) | `main.ts:63` | Pakai NestJS Logger/Pino dengan format JSON — naik prioritas begitu scale multi-instance |
| 🟢 Low | CI ada (build+test di PR/push) tapi tidak ada step `prisma validate` sebelum deploy via `db push` | `.github/workflows/ci.yml` | Tambah step `npx prisma validate` |
| 🟢 Low | Potensi "orphan child row" — `PmProgramEquipment`/`PmChecklistItem` pakai `onDelete: Cascade` tapi parent cuma soft-delete (cascade tidak pernah terpicu) | `schema.prisma` | Verifikasi service PM Program ikut soft-delete child secara eksplisit |
| 🟢 Low | Uniqueness `kimap`/`code` case-sensitive, tidak ada normalisasi — risiko duplikat logis (`abc-01` vs `ABC-01`) | `schema.prisma` | Cek normalisasi di DTO/service sebelum simpan |

**Dikonfirmasi aman:** tidak ada secret ter-commit; `.env.example` lengkap mencakup semua `process.env.*` yang dipakai kode; Docker multi-stage build sudah baik (image size optimal, tidak bawa devDependencies).

---

## Rencana Tindak Lanjut yang Disarankan (urutan prioritas)

**Sprint 1 — Security hardening (sebelum data produksi nyata masuk):**
1. Validasi `JWT_SECRET` wajib saat boot + rate limiting `/auth/login`
2. Pindahkan access token dari `localStorage` ke memory-only
3. Container non-root (`USER node`/`USER nginx`)
4. Whitelist `sortBy` + perbaiki `GlobalExceptionFilter` agar tidak bocorkan pesan internal

**Sprint 2 — Correctness & stabilitas:**
5. State-machine validation untuk `MaintenanceStatus` + requirement `completionDate`
6. Error Boundary global di frontend
7. Dokumentasi rollback & backup strategy database

**Sprint 3 — UX & performance:**
8. Debounce search input (dampak besar, effort kecil)
9. Keyboard accessibility untuk `SearchableSelect`
10. Bulk PM execution: `Promise.allSettled` + endpoint bulk-update

**Backlog (tidak mendesak untuk MVP, tapi dicatat untuk pengembangan jangka panjang):**
- Refactor duplikasi form-dialog jadi shared hook
- Row locking di stock movement (sebelum concurrent multi-user jadi nyata)
- Code-splitting route, konsolidasi query dashboard
- Structured logging, health check endpoint

---

*Catatan metodologi: audit ini berbasis code review statis (read-only), bukan penetration testing atau load testing. Beberapa temuan performance (mis. dampak N+1) adalah hipotesis berdasarkan pola kode, bukan hasil pengukuran — disarankan divalidasi dengan data volume riil sebelum reprioritisasi.*
