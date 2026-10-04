-- Data migration (bukan perubahan schema) — rename role "Viewer" jadi "View" dan seed
-- 2 role baru (Teknisi, Vendor) + matriks hak akses default-nya. Idempotent: aman
-- dijalankan ulang (WHERE NOT EXISTS / ON CONFLICT DO NOTHING), konsisten dengan pola
-- rename OOV->KV di seed.ts.

-- Rename role lama "Viewer" -> "View" (permintaan matriks role: Admin/Teknisi/View/Vendor).
-- No-op kalau sudah pernah di-rename atau environment baru yang belum pernah seed "Viewer".
UPDATE "roles" SET name = 'View' WHERE name = 'Viewer';

-- Role baru: Teknisi & Vendor
INSERT INTO "roles" (id, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'Teknisi',
       'Kelola seluruh modul operasional (Area, Equipment, Maintenance, PM, Spare Part, dst) kecuali User Management',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE name = 'Teknisi');

INSERT INTO "roles" (id, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'Vendor',
       'Hanya bisa melihat Preventive Maintenance dan mengisi hasil eksekusi per periode',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE name = 'Vendor');

-- Default matriks: Teknisi = full CRUD di semua modul operasional, Dashboard view-only
-- (Dashboard memang tidak punya aksi create/edit/delete).
INSERT INTO "role_permissions" (id, role_id, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.module, true,
       (m.module <> 'DASHBOARD'), (m.module <> 'DASHBOARD'), (m.module <> 'DASHBOARD'),
       now(), now()
FROM "roles" r
CROSS JOIN (VALUES
  ('DASHBOARD'::"PermissionModule"),
  ('AREA'::"PermissionModule"),
  ('EQUIPMENT'::"PermissionModule"),
  ('INSTRUMENT_NAME'::"PermissionModule"),
  ('CORRECTIVE_MAINTENANCE'::"PermissionModule"),
  ('VENDOR'::"PermissionModule"),
  ('PM_ACTIVITY_TYPE'::"PermissionModule"),
  ('PM_PROGRAM'::"PermissionModule"),
  ('PM_EXECUTION'::"PermissionModule"),
  ('SPARE_PART'::"PermissionModule")
) AS m(module)
WHERE r.name = 'Teknisi'
ON CONFLICT (role_id, module) DO NOTHING;

-- Default matriks: View = read-only, HANYA 4 modul yang diminta (modul lain tidak
-- punya baris sama sekali = default tersembunyi; Admin bisa tambah lewat UI matriks nanti).
INSERT INTO "role_permissions" (id, role_id, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.module, true, false, false, false, now(), now()
FROM "roles" r
CROSS JOIN (VALUES
  ('DASHBOARD'::"PermissionModule"),
  ('EQUIPMENT'::"PermissionModule"),
  ('CORRECTIVE_MAINTENANCE'::"PermissionModule"),
  ('PM_PROGRAM'::"PermissionModule"),
  ('PM_EXECUTION'::"PermissionModule")
) AS m(module)
WHERE r.name = 'View'
ON CONFLICT (role_id, module) DO NOTHING;

-- Default matriks: Vendor = lihat PM Program (untuk navigasi ke periode), lihat +
-- EDIT hasil eksekusi (bukan edit metadata program itu sendiri). Modul lain tidak
-- punya baris = tersembunyi total.
INSERT INTO "role_permissions" (id, role_id, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT gen_random_uuid(), r.id, 'PM_PROGRAM'::"PermissionModule", true, false, false, false, now(), now()
FROM "roles" r WHERE r.name = 'Vendor'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO "role_permissions" (id, role_id, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT gen_random_uuid(), r.id, 'PM_EXECUTION'::"PermissionModule", true, false, true, false, now(), now()
FROM "roles" r WHERE r.name = 'Vendor'
ON CONFLICT (role_id, module) DO NOTHING;
