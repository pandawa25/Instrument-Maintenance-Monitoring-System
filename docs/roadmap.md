# Roadmap Pengembangan — Instrument Maintenance Monitoring System

Status: **Draft untuk review**. Menggantikan bagian "Roadmap Modul Berikutnya" di `design-document.md` (sudah usang — ditulis sebelum modul PM, Spare Part, dan Dashboard selesai).

Dokumen ini punya 2 bagian: **(A) technical debt & risk** dari kondisi sistem saat ini, dan **(B) roadmap fitur** dalam beberapa phase, disusun berdasarkan urutan ketergantungan dan value terhadap operasional maintenance instrumentasi.

---

## A. Kondisi Sistem Saat Ini

| Modul | Status | Catatan |
|---|---|---|
| Master Area, Equipment, Instrument Name | Selesai | CRUD lengkap |
| Corrective Maintenance | Selesai | + fitur kebutuhan Spare Part/Material |
| Preventive Maintenance (Program, Periode, Eksekusi, Checklist) | Selesai | Termasuk bulk-edit eksekusi |
| Master Vendor, PM Activity Type, Spare Part | Selesai | |
| Dashboard | Selesai | Summary card, 4 chart, tabel terbaru |
| Auth (JWT) & Role (Admin/Viewer) | Selesai (basic) | Belum ada refresh token, belum ada granular permission |

Total 13 tabel, arsitektur modular NestJS + Prisma + React berjalan konsisten. Fondasi ini **cukup kuat untuk dikembangkan lebih jauh** — tidak perlu rewrite, hanya penambahan bertahap.

---

## B. Technical Debt & Risk Register

Diurutkan berdasarkan prioritas (dampak operasional/risiko x kemudahan terlambat diperbaiki).

| # | Item | Risiko Kalau Dibiarkan | Prioritas |
|---|---|---|---|
| 1 | **Tidak ada histori pergerakan stock** — stock Spare Part di-`decrement`/`increment` langsung tanpa ledger. | Tidak bisa audit "kenapa stock jadi segini", tidak bisa lacak siapa/kapan pakai berapa. Untuk sistem maintenance industri ini masalah nyata, bukan kosmetik. | **Tinggi** |
| 2 | **`SparePart.stock` bertipe Int, `quantity` material bertipe Decimal** — saat ini dibulatkan diam-diam di `MaintenanceRepository.decrementStock()`. | Kalau nanti ada part dengan satuan non-bulat (meter, liter), data quantity akan salah tanpa error yang jelas. | Tinggi |
| 3 | **Tidak ada automated test** (unit/e2e) sama sekali. | Setiap perubahan berisiko regresi diam-diam, terutama di area yang sudah kompleks (transaction PM Program, stock adjustment). | Tinggi |
| 4 | **Tidak ada refresh token** — JWT access token saja. | Sesi login expired mendadak di tengah kerja lapangan, atau sebaliknya token diset umur panjang demi kenyamanan (risiko keamanan). | Tinggi |
| 5 | **Agregasi Dashboard dihitung di JS (fetch semua baris lalu loop)**, bukan di level SQL. | Aman untuk data saat ini, tapi tidak scalable — begitu Corrective Maintenance/PM Execution mencapai puluhan ribu baris, endpoint dashboard akan melambat. | Sedang (aksi: pantau, bukan urgent sekarang) |
| 6 | **Tidak ada file/foto attachment** di Corrective Maintenance atau PM Execution. | Temuan lapangan (kerusakan, kondisi sebelum/sesudah) tidak terdokumentasi visual — penting untuk RCA dan klaim vendor/garansi. | Tinggi |
| 7 | **Tidak ada notifikasi** (in-app/email/WhatsApp) untuk PM overdue atau stock rendah. | Dashboard hanya terlihat kalau dibuka manual — risiko PM terlewat tetap ada meski datanya sudah tercatat. | Sedang |
| 8 | **Bundle frontend sudah 930kB** (warning saat build, sejak recharts masuk). | Belum masalah sekarang, tapi tiap modul baru menambah ukuran. Perlu code-splitting per route sebelum jadi keluhan loading time. | Rendah-Sedang |
| 9 | **Tidak ada CI pipeline** (build/test otomatis di GitHub sebelum merge). | Bug baru terdeteksi manual setelah deploy, bukan sebelum merge. | Sedang |
| 10 | **Satu environment saja** (langsung ke Railway production). | Tidak ada tempat aman untuk uji fitur besar sebelum menyentuh data real. | Sedang |
| 11 | **Threshold "low stock" hardcode (≤5)**, bukan per-item. | Part yang consumption rate-nya tinggi butuh threshold lebih tinggi dari part yang jarang dipakai — satu angka untuk semua tidak akurat. | Rendah (sudah disepakati sebagai simplifikasi MVP) |

Item #1, #2, #3, #4, #6 saya rekomendasikan masuk **Phase 2** karena menyangkut integritas data dan keamanan — bukan fitur baru, tapi mengeraskan fondasi sebelum menambah lebih banyak modul di atasnya.

---

## C. Roadmap Fitur (Phase 2 – Phase 6)

Setiap phase dirancang independen — bisa dikerjakan bertahap tanpa menunggu phase berikutnya direncanakan detail.

### Phase 2 — Reliability & Data Integrity Foundation

*Tujuan: mengeraskan fondasi sebelum sistem dipakai lebih luas/lebih lama. Tidak ada fitur baru yang terlihat user, tapi krusial untuk kepercayaan data jangka panjang.*

| Item | Deskripsi |
|---|---|
| Stock Movement Ledger | Tabel baru `spare_part_stock_movements` (spare_part_id, type: IN/OUT/ADJUSTMENT, quantity, reference ke corrective_maintenance, created_by, created_at). `SparePart.stock` jadi kolom hasil hitung/cache, bukan satu-satunya sumber kebenaran. |
| Attachment / Evidence Upload | Tabel `attachments` generik (polymorphic: entity_type + entity_id) + integrasi object storage (Railway Volume atau S3-compatible seperti Cloudflare R2). Dipakai di Corrective Maintenance & PM Execution. |
| Refresh Token & Session Hardening | Refresh token rotation, access token umur pendek (15 menit), audit `last_login_at` sudah ada — tambah `login_history`. |
| Automated Testing Baseline | Unit test untuk service layer kritikal (stock adjustment, area sync, PM period generation) + minimal 1 e2e flow (login → create CM → verify stock). Target coverage bertahap, bukan 100% langsung. |
| CI Pipeline (GitHub Actions) | Build + lint + test otomatis di tiap PR ke `main`. |
| Audit Log Terpusat | Tabel `audit_logs` (siapa mengubah apa, kapan, before/after) untuk entity sensitif (User, Corrective Maintenance status, Stock). |

### Phase 3 — Work Order System

*Tujuan: menyatukan Corrective Maintenance dan Preventive Maintenance di bawah konsep "Work Order" — sesuai arah yang sudah disebut di project brief awal.*

| Item | Deskripsi |
|---|---|
| Entitas Work Order | Nomor WO auto-generate, tipe (Corrective/Preventive), link ke `corrective_maintenance` atau `pm_period_execution` yang sudah ada (bukan replace, tapi layer di atasnya). |
| Approval Workflow | Status tambahan: Draft → Submitted → Approved → Closed, dengan role approver (mis. Supervisor). |
| Assignment & Due Date | WO bisa di-assign ke teknisi dengan due date, terpisah dari tanggal pelaksanaan aktual. |
| Notifikasi | WO baru/overdue → notifikasi in-app minimal, email opsional. |

### Phase 4 — Instrument Health Index & Reliability Analytics

*Tujuan: mengubah data historis maintenance jadi insight reliability — nilai tambah terbesar untuk peran reliability engineer.*

| Item | Deskripsi |
|---|---|
| MTBF / MTTR per Equipment | Dihitung dari histori `corrective_maintenance` (downtime_hours, maintenance_date) per equipment/area. |
| Health Index Score | Skor komposit per equipment (frekuensi kerusakan, downtime, kepatuhan PM, umur/criticality) — formula disepakati dulu sebelum implementasi. |
| Kalibrasi Due Tracking | Kalau equipment butuh kalibrasi berkala (umum di instrumentasi), tambah `calibration_interval` + tracking due date mirip pola PM Period. |
| Reporting Export | Export PDF/Excel untuk laporan bulanan (KPI, MTBF/MTTR, PM compliance) — dipakai untuk laporan ke manajemen. |

### Phase 5 — Asset Lifecycle Management

*Tujuan: memperluas Master Equipment jadi pengelolaan aset penuh, bukan cuma data teknis.*

| Item | Deskripsi |
|---|---|
| Hierarki Plant → Area → Equipment | `areas` saat ini flat; tambah level `plants` di atasnya untuk multi-site/multi-plant. |
| Warranty & Depreciation | Field warranty expiry, nilai buku, metode depresiasi. |
| Lifecycle Status | Commissioning → Active → Decommissioned, dengan histori perpindahan status. |
| Equipment Replacement History | Link equipment lama → equipment pengganti (retag), supaya histori maintenance tidak putus. |

### Phase 6 — Enterprise Hardening & Scale-Out

*Tujuan: dijalankan kalau sistem sudah dipakai multi-plant/multi-tenant atau volume data & user signifikan bertambah.*

| Item | Deskripsi |
|---|---|
| Caching Layer (Redis) | Untuk endpoint Dashboard & lookup yang sering diakses. |
| Query Aggregation di Level SQL | Ganti agregasi JS di Dashboard jadi `$queryRaw`/materialized view kalau data sudah besar (lihat Risk #5). |
| SSO / Integrasi Active Directory | Kalau perusahaan sudah punya AD/SSO korporat. |
| PWA / Mobile-Friendly untuk Lapangan | Form input cepat untuk teknisi di lapangan, idealnya bisa input offline lalu sync. |
| Horizontal Scaling Backend | Kalau 1 instance Railway sudah tidak cukup — perlu load balancer + stateless session (sudah JWT jadi relatif siap). |

---

## D. Rekomendasi Urutan Eksekusi

1. **Phase 2 dulu, wajib** — sebelum tambah fitur baru, karena menyangkut integritas data yang sudah dipakai (Stock Ledger terutama, karena makin lama makin sulit di-backfill datanya).
2. **Phase 3 dan Phase 4 bisa paralel/dipilih sesuai kebutuhan bisnis mendesak** — Work Order kalau butuh formalitas approval, Health Index kalau fokusnya insight/reliability reporting.
3. **Phase 5 dan 6 ditunda sampai ada sinyal nyata kebutuhannya** (multi-plant, atau volume data/user yang mulai terasa lambat) — menghindari over-engineering di tahap ini.
