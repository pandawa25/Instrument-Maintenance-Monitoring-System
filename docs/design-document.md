# System Design Document — Instrument Maintenance Monitoring System

Status: **Disetujui** (27 Sep 2026). Versi lengkap dengan penjelasan visual ada di artifact yang dikirim ke Claude sebelum tahap implementasi ini dimulai.

## Ringkasan Keputusan

- **6 tabel inti**: `roles`, `users`, `areas`, `instrument_types`, `instruments`, `corrective_maintenance`.
- Semua tabel: UUID PK, `created_at`, `updated_at`, `deleted_at` (soft delete).
- `roles` dan `instrument_types` adalah tabel referensi (bukan enum) agar bisa di-CRUD tanpa redeploy.
- `corrective_maintenance.area_id` didenormalisasi dari `instrument.area_id` untuk performa filter dashboard — disinkronkan di service layer saat create.
- `corrective_maintenance.technician_id` adalah FK ke `users`, bukan teks bebas — menyiapkan analitik reliability per-teknisi di roadmap.
- `corrective_maintenance.created_by_id` untuk audit trail.

## Skema Database

Lihat `apps/backend/prisma/schema.prisma` sebagai sumber kebenaran (source of truth). Ringkasan kolom & index ada di tabel berikut.

| Tabel | Kolom Kunci | Index |
|---|---|---|
| roles | name (unique) | — |
| users | email (unique), role_id (FK) | role_id |
| areas | area_code (unique), status | status |
| instrument_types | type_code (unique) | — |
| instruments | tag_number (unique), area_id (FK), instrument_type_id (FK), status, criticality | area_id, instrument_type_id, status, (area_id, status) |
| corrective_maintenance | maintenance_date, instrument_id (FK), area_id (FK, denormalized), technician_id (FK), created_by_id (FK), status | maintenance_date, instrument_id, area_id, status, (area_id, maintenance_date) |

## API Contract Standar

**Pagination & filtering** (semua endpoint list):

```
GET /resource?page=1&limit=20&search=&sortBy=createdAt&sortOrder=desc
```

**Response envelope:**

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

**Error envelope** (dari `GlobalExceptionFilter`):

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["area_code is required"],
  "path": "/api/areas",
  "timestamp": "2026-09-27T15:00:00.000Z"
}
```

## Roadmap Modul Berikutnya

1. Module Instrument (mengikuti pola Module Area)
2. Module Corrective Maintenance (dengan sinkronisasi `area_id` di service layer)
3. Dashboard (summary cards + 3 chart + latest maintenance table)
4. Phase 2 (di luar MVP): audit log terpisah, refresh-token rotation, granular permission, attachment evidence, tabel `plants` di atas `areas`, notifikasi.
