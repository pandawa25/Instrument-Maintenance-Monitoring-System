-- Data migration (bukan perubahan schema). Modul WORK_ORDER baru ditambahkan setelah
-- migration 20261004080100_seed_role_permission_matrix dijalankan, jadi role Teknisi
-- di environment yang sudah ada BELUM punya baris role_permissions untuk modul ini —
-- seed.ts sendiri sudah mencakup WORK_ORDER di OPERATIONAL_MODULES, tapi seed.ts hanya
-- jalan manual (bukan bagian dari `prisma migrate deploy` di CMD Dockerfile), jadi
-- perbaikan ini dibuat sebagai migration supaya otomatis ikut jalan saat deploy.
-- Idempotent: ON CONFLICT DO NOTHING, aman dijalankan berulang / di environment baru
-- (di mana seed.ts yang akan membuat baris ini duluan, lalu migration ini no-op).
INSERT INTO "role_permissions" (id, role_id, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT gen_random_uuid(), r.id, 'WORK_ORDER'::"PermissionModule", true, true, true, true, now(), now()
FROM "roles" r
WHERE r.name = 'Teknisi'
ON CONFLICT (role_id, module) DO NOTHING;
