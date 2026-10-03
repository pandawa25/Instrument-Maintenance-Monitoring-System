# Roadmap Pengembangan — Instrument Maintenance Monitoring System

**Status:** Revisi 3 Oktober 2026. Menggantikan revisi sebelumnya yang ditulis saat sistem
masih 3 modul/6 tabel — sudah usang karena sebagian besar isi "Phase 2"-nya di revisi lama
sudah selesai dikerjakan (dengan penomoran phase berbeda, lihat README `Status Pengembangan`).

Dokumen ini: **(A)** kondisi sistem saat ini, **(B)** technical debt & risk register yang
masih terbuka, **(C)** roadmap fitur Phase 5 ke atas, **(D)** rekomendasi urutan eksekusi.

---

## A. Kondisi Sistem Saat Ini

Sistem sudah melewati tahap MVP murni — pertumbuhannya:

| | MVP awal (project brief) | Kondisi sekarang |
|---|---|---|
| Modul operasional | 3 (Area, Instrument, Corrective Maintenance) | 9+ (+ PM Program/Period/Execution, Spare Part + Stock Ledger, Vendor, Manage User, Attachment/Evidence, Audit Log, KPI & Health Index Dashboard) |
| Model database (Prisma) | 6 | 23 |
| Auth | JWT access token saja | Refresh token rotation + reuse detection, rate limiting login, login history, access token memory-only (bukan localStorage) |
| Observability | — | Audit log terpusat (siapa/apa/kapan, redaksi otomatis field sensitif) |
| Analytics | Dashboard ringkas (4 summary card + 3 chart) | + KPI (MTTR/MTBF/PM Compliance Rate, 3 level agregasi) + Instrument Health Index (skor komposit percentile-based) |
| Testing | — | Jest unit test backend (6 suite, 45 test — auth, RBAC, stock ledger, audit log, dashboard KPI) + CI (build+test otomatis tiap PR) |
| Security hardening | — | 10/10 temuan audit (security, correctness, UX, DevOps) selesai — lihat `docs/system-audit-2026-10-03.md` |

**Yang BELUM dikerjakan (bukan oversight, sengaja di luar scope sampai sekarang):**
- Work Order formal (approval workflow, assignment) — saat ini cuma field referensi manual ke ERP eksternal, sesuai keputusan desain di README.
- Hierarki Plant (multi-site) — `areas` masih flat, asumsi 1 plant.
- Kalibrasi instrumentasi (calibration due tracking) — belum ada field/entity.
- Test frontend (Vitest/RTL) — 0 test, seluruhnya manual QA.
- Notifikasi proaktif (PM overdue, low stock) — info hanya terlihat kalau dashboard dibuka manual.

---

## B. Technical Debt & Risk Register

Diurutkan berdasarkan dampak x kemudahan terlambat diperbaiki. Status diverifikasi langsung
dari kode per 3 Oktober 2026 (bukan asumsi dari dokumen lama).

| # | Item | Risiko Kalau Dibiarkan | Prioritas | Status |
|---|---|---|---|---|
| 1 | **`SparePart.stock` bertipe `Int`, tapi `quantity` pemakaian material `Decimal(10,2)`** (`schema.prisma:467,515`) | Aman untuk part satuan bulat (pcs/unit). Part dengan satuan non-bulat (meter kabel, liter oli) akan dibulatkan diam-diam tanpa error — data stock jadi salah tanpa jejak. | **Tinggi** | **Fixed** (`5ed9f17`, `58d009a`, migration `20261003180000_spare_part_stock_decimal` — 3 Okt 2026): `stock`/`minStock`/`quantityDelta`/`balanceAfter` jadi `Decimal(10,2)` di kode **dan** di database production (migration sudah diterapkan via `ALTER TABLE` manual + `prisma migrate resolve --applied`, bukan `migrate dev` karena ada schema drift kosmetik — lihat Risk #2). `Math.round()` di `maintenance.repository.ts` dihapus. |
| 2 | **Deploy pakai `prisma db push --accept-data-loss`, bukan `migrate deploy`** — tidak ada file migration formal ter-commit | Tidak ada riwayat perubahan schema yang bisa di-review seperti code review biasa; rollback container tidak otomatis rollback schema (sudah didokumentasikan prosedur manualnya di README, tapi tetap manual/rawan human error) | Tinggi | **Fixed** (3 Okt 2026) — **koreksi atas catatan sebelumnya yang salah**: ternyata 13 migration formal sudah lebih dulu ada & ter-commit di `prisma/migrations/` (dibuat di sesi kerja sebelumnya, tapi production selama ini tetap jalan via `db push` sehingga tabel `_prisma_migrations` kosong/tidak sinkron). Hari ini: production di-baseline (`migrate resolve --applied` untuk 13 migration lama + 1 migration baru `spare_part_stock_decimal`), `Dockerfile.backend` diubah ke `prisma migrate deploy`, `README.md` diperbarui. **Diketahui saat eksekusi**: `prisma migrate dev` sempat minta **reset total schema** karena mendeteksi drift penamaan FK/index di `corrective_maintenance_technicians` (lihat Risk #14) — dihindari dengan menulis & menjalankan migration SQL secara manual alih-alih lewat `migrate dev` otomatis. **Diverifikasi**: deploy Railway dengan `Dockerfile.backend` baru sukses (`migrate deploy` lolos sebelum `node dist/main.js` jalan — CMD pakai `&&`, kalau migrate gagal app tidak akan start), backend hidup normal di production. Public Networking Postgres yang dibuka sementara untuk proses ini sudah ditutup kembali. |
| 3 | **Tidak ada test frontend sama sekali** (Vitest/RTL — 0 file `*.test.*`) | Regresi UI (terutama logic form-dialog, kalkulasi client-side seperti validasi completionDate) hanya terdeteksi lewat QA manual | Tinggi | **Fixed** (`5dec52f` — 3 Okt 2026): setup Vitest 2.x + React Testing Library + CI step, 17 test baseline (`useDebouncedValue`, `maintenance-status.util.getSelectableStatuses`, `SearchableSelect` keyboard a11y). Baseline, bukan coverage penuh — modul lain (form-dialog, dashboard chart) masih perlu ditambahkan bertahap. |
| 4 | **Coverage test backend masih sempit** — 6 suite (auth, RBAC, stock ledger, audit log redaction, dashboard KPI) dari ~15 modul | Modul tanpa test (Equipment, PM Program, Maintenance state-machine yang baru ditambah, dll) berisiko regresi diam-diam | Sedang-Tinggi | **Fixed** (`1385445`, `28ee821` — 3 Okt 2026): tambah 3 suite baru — `maintenance-status.util` (35 test, semua transisi valid/invalid), `EquipmentService` (18 test), `PmProgramsService` (9 test). Total backend sekarang 9 suite, 99 test. Modul lain yang masih belum punya test: Areas, Instrument Names, Vendors, PM Activity Types, PM Periods, Attachments, Users/Roles — prioritas berikutnya kalau mau coverage lebih merata. |
| 5 | **Duplikasi pola form-dialog identik di 10+ modul** (state sync, submit, error handling — tidak ada hook bersama) | Perbaikan bug/pola di satu form tidak otomatis menular ke form lain; effort maintenance berlipat tiap ada perubahan pola | Sedang | Open |
| 6 | **Race condition stock movement** — tidak ada row lock (`SELECT ... FOR UPDATE`) di `SparePartsRepository.recordMovement()` | Aman untuk tim kecil (<20 user) saat ini. Begitu concurrent user bertambah, 2 transaksi stock bersamaan bisa saling menimpa | Sedang (disadari & diterima sementara, dikomentari di kode) | Open |
| 7 | **Dashboard & KPI dihitung on-the-fly di JS** (fetch semua baris lalu `.reduce()`/`.filter()`), bukan SQL `GROUP BY` | Aman untuk data saat ini. Begitu Corrective Maintenance/PM Execution mencapai puluhan ribu baris, endpoint ini pertama kali melambat | Sedang (pantau, belum urgent) | Open |
| 8 | **Bundle frontend 1.09 MB** (minified, sebelum gzip 309 kB) — tidak ada code-splitting route | Waktu load awal makin lama tiap modul baru ditambah; belum terasa di koneksi kantor, bisa terasa di lapangan dengan sinyal lemah | Rendah-Sedang | Open |
| 9 | **Tidak ada `HEALTHCHECK`/endpoint health** | Railway tidak bisa deteksi container "hidup tapi stuck" (mis. DB connection pool habis) — restart hanya terjadi kalau proses benar-benar crash | Sedang | Open |
| 10 | **Logging masih `console.log` polos**, bukan structured (JSON) | Sulit di-query/filter kalau nanti pakai log aggregator (mis. Railway log search, atau export ke observability tool) | Sedang (naik prioritas begitu multi-instance) | Open |
| 11 | **N+1 request dari frontend saat "Isi Massal" PM Execution** (1 PUT per equipment, paralel — sudah `Promise.allSettled` untuk reliability, tapi tetap N request) | Lambat untuk periode dengan banyak equipment (puluhan); beban ke backend juga N kali lipat dari seharusnya | Rendah-Sedang | Sebagian — reliability sudah dibenahi (lihat Sprint 3), endpoint bulk-update tunggal belum |
| 12 | **Threshold "low stock" default 0** (baru ditandai low stock kalau stock = 0) | Part dengan lead-time pengadaan panjang butuh peringatan lebih awal — tapi ini field yang **bisa** diisi manual per-item oleh Admin, jadi bukan hard limitation | Rendah (sudah ada mitigasi di level data) | Open, tidak mendesak |
| 13 | **`<button>` di dalam `<button>`** di `SearchableSelect` (tombol "Hapus pilihan" bersarang di dalam trigger) — ditemukan dari `validateDOMNesting` warning saat menulis test (3 Okt 2026) | HTML tidak valid — browser bisa auto-close tag lebih awal dari yang diharapkan, perilaku klik/fokus pada nested button secara teknis undefined meski berhasil di test & manual testing sejauh ini | Sedang | Open |
| 14 | **Schema drift kosmetik di `corrective_maintenance_technicians`** — nama foreign key & unique index di database production (`corrective_maintenance_technicians_corrective_maintenance_id_fk`/`..._us`) beda dari yang dicatat migration history (`..._fkey`/`..._key`, konvensi penamaan default Prisma) — ditemukan `prisma migrate dev` saat eksekusi Risk #2 (3 Okt 2026), kemungkinan sisa dari saat tabel ini pernah dibuat/diubah lewat `db push` dengan penamaan berbeda | Tidak mempengaruhi fungsi aplikasi (constraint tetap bekerja, cuma beda nama), tapi `prisma migrate dev` akan terus minta **reset total schema** setiap dijalankan sampai drift ini diperbaiki — menghalangi pemakaian `migrate dev` untuk migration berikutnya (migration manual seperti Risk #2 masih bisa, tapi lebih ribet) | Sedang | Open — perbaikan: `ALTER TABLE ... RENAME CONSTRAINT`/`RENAME INDEX` manual untuk menyamakan nama di production dengan yang di migration file, lalu `migrate resolve` ulang kalau perlu |

---

## C. Roadmap Fitur (Phase 5 ke atas)

Penomoran melanjutkan README `Status Pengembangan` (terakhir: Phase 4b selesai 3 Okt 2026).
Setiap phase independen — bisa dikerjakan bertahap tanpa menunggu phase berikutnya
direncanakan detail.

### Phase 5 — Hardening Lanjutan & Kesiapan Scale

*Tujuan: menutup technical debt di atas sebelum menambah lapisan fitur baru (Work Order,
Asset Lifecycle) di atas fondasi yang masih punya celah. Tidak ada fitur baru yang terlihat
user.*

| Item | Deskripsi | Terkait Risk # |
|---|---|---|
| Migrasi `SparePart.stock` ke `Decimal` | Ubah tipe kolom + semua kalkulasi terkait (stock movement, dashboard inventory) — breaking change schema, butuh migration terencana | #1 |
| Migrasi ke `prisma migrate deploy` formal | Generate migration awal dari schema saat ini, commit ke `prisma/migrations/`, ubah Dockerfile CMD | #2 |
| Test frontend baseline (Vitest + Testing Library) | Mulai dari logic kritis: validasi form (state-machine maintenance status), komponen shared (`SearchableSelect` keyboard nav, `SearchInput` debounce) | #3 |
| Perluas test backend | Equipment, PM Program (transaction replace-all), Maintenance state-machine (baru ditambah 3 Okt) | #4 |
| `useCrudFormDialog()` — hook generik form-dialog | Refactor 10+ form-dialog ke 1 pola bersama | #5 |
| Row locking stock movement | `SELECT ... FOR UPDATE` atau optimistic locking (`version` column) | #6 |
| `GET /health` endpoint + `HEALTHCHECK` Dockerfile | Cek koneksi DB via `$queryRaw` | #9 |
| Structured logging (Pino) | Ganti `console.log` di `main.ts` | #10 |
| Endpoint bulk-update tunggal untuk PM Execution | 1 request untuk N equipment, bukan N request paralel | #11 |
| Code-splitting route (`React.lazy` + `Suspense`) | Minimal untuk Dashboard, Maintenance, PM Programs (halaman terberat) | #8 |

### Phase 6 — Work Order System

*Tujuan: formalisasi Work Order sesuai arah awal project brief — saat ini Corrective
Maintenance & PM Execution berjalan independen dengan field referensi manual ke ERP.*

| Item | Deskripsi |
|---|---|
| Entitas Work Order | Nomor WO auto-generate, tipe (Corrective/Preventive), link ke `corrective_maintenance`/`pm_period_execution` yang sudah ada (layer di atas, bukan replace) |
| Approval Workflow | Status Draft → Submitted → Approved → Closed, dengan role approver (mis. Supervisor — perlu role baru selain Admin/Viewer) |
| Assignment & Due Date | WO di-assign ke teknisi dengan due date, terpisah dari tanggal pelaksanaan aktual |
| Notifikasi dasar | WO baru/overdue → notifikasi in-app minimal (polling atau WebSocket), email opsional |

### Phase 7 — Reliability Analytics Lanjutan & Kalibrasi

*Tujuan: KPI Dashboard & Health Index sudah ada (Phase 3b/3c) — phase ini melengkapi sisi
yang belum tersentuh: kalibrasi dan reporting formal.*

| Item | Deskripsi |
|---|---|
| Kalibrasi Due Tracking | `calibration_interval` per equipment + tracking due date, mirip pola PM Period yang sudah ada |
| Reporting Export PDF/Excel terjadwal | Export Excel sudah ada di Corrective Maintenance list — perluas ke laporan bulanan gabungan (KPI + MTBF/MTTR + PM Compliance) untuk laporan ke manajemen |
| MTBF berbasis running hours (opsional) | Saat ini MTBF calendar-based (disadari sebagai keterbatasan di README) — butuh running-hours meter per equipment kalau mau MTBF klasik |

### Phase 8 — Asset Lifecycle Management

*Tujuan: memperluas Master Equipment jadi pengelolaan aset penuh.*

| Item | Deskripsi |
|---|---|
| Hierarki Plant → Area → Equipment | `areas` saat ini flat; tambah level `plants` untuk multi-site |
| Warranty & Depreciation | Field warranty expiry, nilai buku, metode depresiasi |
| Lifecycle Status | Commissioning → Active → Decommissioned, dengan histori perpindahan status |
| Equipment Replacement History | Link equipment lama → pengganti (retag), histori maintenance tidak putus |

### Phase 9 — Enterprise Hardening & Scale-Out

*Tujuan: dijalankan kalau sistem sudah dipakai multi-plant/multi-tenant, atau volume
data/user bertambah signifikan — bukan sebelumnya (hindari over-engineering).*

| Item | Deskripsi |
|---|---|
| Caching Layer (Redis) | Endpoint Dashboard & lookup yang sering diakses |
| Query Aggregation di Level SQL | Ganti agregasi JS jadi `$queryRaw`/materialized view (lihat Risk #7) |
| SSO / Integrasi Active Directory | Kalau perusahaan sudah punya AD/SSO korporat |
| PWA / Mobile-Friendly Lapangan | Input cepat untuk teknisi, idealnya bisa offline lalu sync |
| Horizontal Scaling Backend | Load balancer + stateless session (JWT sudah siap untuk ini) |

---

## D. Rekomendasi Urutan Eksekusi

1. **Phase 5 dulu** — terutama migrasi `stock` ke `Decimal` (#1) dan `prisma migrate deploy`
   (#2). Keduanya makin mahal diperbaiki semakin lama ditunda (data production bertambah,
   migrasi jadi makin berisiko). Test baseline frontend (#3) juga strategis dikerjakan
   sebelum Phase 6/7/8 menambah kompleksitas UI lebih jauh.
2. **Phase 6 dan 7 bisa dipilih sesuai kebutuhan bisnis mendesak** — Work Order kalau
   organisasi butuh approval formal, Reliability Analytics lanjutan kalau fokusnya
   pelaporan ke manajemen/kalibrasi compliance.
3. **Phase 8 dan 9 ditunda sampai ada sinyal nyata kebutuhannya** (multi-plant, atau
   volume data/user mulai terasa lambat) — konsisten dengan prinsip MVP: jangan
   over-engineering untuk kebutuhan yang belum terjadi.

---

*Dokumen ini hidup — update setiap kali ada phase yang selesai atau prioritas bisnis
berubah, sama seperti `docs/system-audit-2026-10-03.md` untuk tracking remediasi audit.*
