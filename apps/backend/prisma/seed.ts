import { PrismaClient, AreaStatus, EquipmentStatus, Criticality } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const INSTRUMENT_NAMES: Array<{ code: string; name: string }> = [
  { code: 'PT', name: 'Pressure Transmitter' },
  { code: 'TT', name: 'Temperature Transmitter' },
  { code: 'FT', name: 'Flow Transmitter' },
  { code: 'LT', name: 'Level Transmitter' },
  { code: 'PG', name: 'Pressure Gauge' },
  { code: 'TG', name: 'Temperature Gauge' },
  { code: 'CV', name: 'Control Valve' },
  { code: 'OOV', name: 'On-Off Valve' },
  { code: 'VP', name: 'Valve Positioner' },
  { code: 'AN', name: 'Analyzer' },
  { code: 'GD', name: 'Gas Detector' },
  { code: 'VS', name: 'Vibration Sensor' },
  { code: 'PLC', name: 'PLC' },
  { code: 'RTU', name: 'RTU' },
  { code: 'FC', name: 'Flow Computer' },
];

async function main() {
  console.log('Seeding roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Full access — CRUD semua master data & user management' },
  });

  await prisma.role.upsert({
    where: { name: 'Viewer' },
    update: {},
    create: { name: 'Viewer', description: 'Read-only — dashboard, equipment, dan riwayat maintenance' },
  });

  console.log('Seeding instrument names...');
  for (const item of INSTRUMENT_NAMES) {
    await prisma.instrumentName.upsert({
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
    await prisma.equipment.upsert({
      where: { tagNumber: 'PU-01-PT-1001' },
      update: {},
      create: {
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
