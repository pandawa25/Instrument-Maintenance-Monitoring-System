import { PrismaClient, AreaStatus, EquipmentStatus, Criticality, PermissionModule } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Modul operasional (di luar Dashboard) yang dapat full CRUD oleh Teknisi.
const OPERATIONAL_MODULES: PermissionModule[] = [
  PermissionModule.AREA,
  PermissionModule.EQUIPMENT,
  PermissionModule.INSTRUMENT_NAME,
  PermissionModule.CORRECTIVE_MAINTENANCE,
  PermissionModule.VENDOR,
  PermissionModule.PM_ACTIVITY_TYPE,
  PermissionModule.PM_PROGRAM,
  PermissionModule.PM_EXECUTION,
  PermissionModule.SPARE_PART,
];

// Modul yang boleh dilihat (view-only) oleh role View, sesuai permintaan user:
// Dashboard, Equipment, Corrective Maintenance, Preventive Maintenance (Program & Execution).
const VIEW_ROLE_MODULES: PermissionModule[] = [
  PermissionModule.DASHBOARD,
  PermissionModule.EQUIPMENT,
  PermissionModule.CORRECTIVE_MAINTENANCE,
  PermissionModule.PM_PROGRAM,
  PermissionModule.PM_EXECUTION,
];

const INSTRUMENT_NAMES: Array<{ code: string; name: string }> = [
  { code: 'PT', name: 'Pressure Transmitter' },
  { code: 'TT', name: 'Temperature Transmitter' },
  { code: 'FT', name: 'Flow Transmitter' },
  { code: 'LT', name: 'Level Transmitter' },
  { code: 'PG', name: 'Pressure Gauge' },
  { code: 'TG', name: 'Temperature Gauge' },
  { code: 'CV', name: 'Control Valve' },
  { code: 'SV', name: 'Solenoid Valve' },
  { code: 'KV', name: 'On-Off Valve' },
  { code: 'UV', name: 'On-Off Valve SIS' },
  { code: 'VP', name: 'Valve Positioner' },
  { code: 'AN', name: 'Analyzer' },
  { code: 'GD', name: 'Gas Detector' },
  { code: 'VS', name: 'Vibration Sensor' },
  { code: 'PLC', name: 'PLC' },
  { code: 'RTU', name: 'RTU' },
  { code: 'FC', name: 'Flow Computer' },
];

const PM_ACTIVITY_TYPES: Array<{ code: string; name: string }> = [
  { code: 'CLN', name: 'Cleaning' },
  { code: 'VIS', name: 'Visual Check / Inspection' },
  { code: 'CAL', name: 'Calibration' },
  { code: 'DRT', name: 'Drift Test' },
  { code: 'RSN', name: 'Replace Sensor' },
  { code: 'ZSA', name: 'Zero & Span Adjustment' },
  { code: 'FNT', name: 'Function Test' },
  { code: 'LPC', name: 'Loop Check' },
  { code: 'RBT', name: 'Replace Battery' },
  { code: 'RCP', name: 'Replace Consumable Parts' },
  { code: 'LUB', name: 'Lubrication' },
  { code: 'TTC', name: 'Tightening / Torque Check' },
  { code: 'WRC', name: 'Wiring & Connection Check' },
  { code: 'FWU', name: 'Firmware/Software Update' },
  { code: 'LKT', name: 'Leak Test' },
  { code: 'COR', name: 'Corrosion Check / Painting' },
];

async function main() {
  console.log('Seeding roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Full access — CRUD semua master data & user management' },
  });

  // Rename role lama 'Viewer' -> 'View' (penyesuaian penamaan matriks role:
  // Admin/Teknisi/View/Vendor). No-op kalau sudah pernah di-rename.
  const legacyViewer = await prisma.role.findUnique({ where: { name: 'Viewer' } });
  if (legacyViewer) {
    await prisma.role.update({ where: { name: 'Viewer' }, data: { name: 'View' } });
  }

  const viewRole = await prisma.role.upsert({
    where: { name: 'View' },
    update: {},
    create: { name: 'View', description: 'Read-only — dashboard, equipment, corrective & preventive maintenance' },
  });

  const teknisiRole = await prisma.role.upsert({
    where: { name: 'Teknisi' },
    update: {},
    create: {
      name: 'Teknisi',
      description:
        'Kelola seluruh modul operasional (Area, Equipment, Maintenance, PM, Spare Part, dst) kecuali User Management',
    },
  });

  const vendorRole = await prisma.role.upsert({
    where: { name: 'Vendor' },
    update: {},
    create: {
      name: 'Vendor',
      description: 'Hanya bisa melihat Preventive Maintenance dan mengisi hasil eksekusi per periode',
    },
  });

  console.log('Seeding role permission matrix...');
  // Teknisi: full CRUD di semua modul operasional, Dashboard view-only (tidak ada aksi
  // create/edit/delete untuk Dashboard).
  await prisma.rolePermission.upsert({
    where: { roleId_module: { roleId: teknisiRole.id, module: PermissionModule.DASHBOARD } },
    update: {},
    create: {
      roleId: teknisiRole.id,
      module: PermissionModule.DASHBOARD,
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    },
  });
  for (const mod of OPERATIONAL_MODULES) {
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: teknisiRole.id, module: mod } },
      update: {},
      create: { roleId: teknisiRole.id, module: mod, canView: true, canCreate: true, canEdit: true, canDelete: true },
    });
  }

  // View: read-only, hanya 4 modul yang diminta (modul lain tidak punya baris sama
  // sekali = default tersembunyi; Admin bisa tambah lewat UI matriks nanti).
  for (const mod of VIEW_ROLE_MODULES) {
    await prisma.rolePermission.upsert({
      where: { roleId_module: { roleId: viewRole.id, module: mod } },
      update: {},
      create: { roleId: viewRole.id, module: mod, canView: true, canCreate: false, canEdit: false, canDelete: false },
    });
  }

  // Vendor: lihat PM Program (untuk navigasi ke periode), lihat + EDIT hasil eksekusi
  // (bukan edit metadata program itu sendiri). Modul lain tersembunyi total.
  await prisma.rolePermission.upsert({
    where: { roleId_module: { roleId: vendorRole.id, module: PermissionModule.PM_PROGRAM } },
    update: {},
    create: {
      roleId: vendorRole.id,
      module: PermissionModule.PM_PROGRAM,
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_module: { roleId: vendorRole.id, module: PermissionModule.PM_EXECUTION } },
    update: {},
    create: {
      roleId: vendorRole.id,
      module: PermissionModule.PM_EXECUTION,
      canView: true,
      canCreate: false,
      canEdit: true,
      canDelete: false,
    },
  });

  console.log('Seeding instrument names...');
  // Migrasi kode lama 'OOV' (On-Off Valve) -> 'KV' (penyesuaian kode sesuai konvensi
  // user: CV/SV/KV/UV untuk 4 tipe valve). Rename in-place supaya equipment yang sudah
  // terlanjur pakai instrumentNameId lama tetap valid (FK tidak berubah, cuma code-nya).
  // Idempotent: no-op kalau 'OOV' sudah tidak ada (baik karena sudah pernah di-rename,
  // atau environment baru yang belum pernah seed versi lama).
  const legacyOov = await prisma.instrumentName.findUnique({ where: { code: 'OOV' } });
  if (legacyOov) {
    await prisma.instrumentName.update({ where: { code: 'OOV' }, data: { code: 'KV', name: 'On-Off Valve' } });
  }

  for (const item of INSTRUMENT_NAMES) {
    await prisma.instrumentName.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  console.log('Seeding pm activity types...');
  for (const item of PM_ACTIVITY_TYPES) {
    await prisma.pmActivityType.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  console.log('Seeding default admin user...');
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@imms.local' },
    update: {},
    create: {
      email: 'admin@imms.local',
      passwordHash,
      fullName: 'System Administrator',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log('Seeding sample area (untuk development)...');
  const area = await prisma.area.upsert({
    where: { areaCode: 'PU-01' },
    update: {},
    create: {
      areaCode: 'PU-01',
      areaName: 'Process Unit 01',
      description: 'Contoh area untuk development/testing',
      status: AreaStatus.ACTIVE,
    },
  });

  const pt = await prisma.instrumentName.findUnique({ where: { code: 'PT' } });
  if (pt) {
    // tagNumber bukan lagi @unique biasa di schema.prisma (diganti partial unique index
    // case-insensitive + active-rows-only lewat migration SQL) — Prisma generated types
    // jadi tidak lagi menerima tagNumber sebagai field `where` untuk upsert/findUnique.
    // Pola findFirst + create manual ini meniru logic findByTagNumber() di
    // equipment.repository.ts supaya seeding tetap idempotent.
    const existingEquipment = await prisma.equipment.findFirst({
      where: { tagNumber: { equals: 'PU-01-PT-1001', mode: 'insensitive' }, deletedAt: null },
    });
    if (!existingEquipment) {
      await prisma.equipment.create({
        data: {
          tagNumber: 'PU-01-PT-1001',
          service: 'Pressure Transmitter Separator Inlet',
          areaId: area.id,
          instrumentNameId: pt.id,
          manufacturer: 'Yokogawa',
          model: 'EJA430E',
          status: EquipmentStatus.ACTIVE,
          criticality: Criticality.HIGH,
        },
      });
    }
  }

  console.log('Seed selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
