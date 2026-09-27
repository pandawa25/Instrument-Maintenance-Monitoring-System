import { PrismaClient, AreaStatus, InstrumentStatus, Criticality } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const INSTRUMENT_TYPES: Array<{ typeCode: string; typeName: string }> = [
  { typeCode: 'PT', typeName: 'Pressure Transmitter' },
  { typeCode: 'TT', typeName: 'Temperature Transmitter' },
  { typeCode: 'FT', typeName: 'Flow Transmitter' },
  { typeCode: 'LT', typeName: 'Level Transmitter' },
  { typeCode: 'PG', typeName: 'Pressure Gauge' },
  { typeCode: 'TG', typeName: 'Temperature Gauge' },
  { typeCode: 'CV', typeName: 'Control Valve' },
  { typeCode: 'OOV', typeName: 'On-Off Valve' },
  { typeCode: 'VP', typeName: 'Valve Positioner' },
  { typeCode: 'AN', typeName: 'Analyzer' },
  { typeCode: 'GD', typeName: 'Gas Detector' },
  { typeCode: 'VS', typeName: 'Vibration Sensor' },
  { typeCode: 'PLC', typeName: 'PLC' },
  { typeCode: 'RTU', typeName: 'RTU' },
  { typeCode: 'FC', typeName: 'Flow Computer' },
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
    create: { name: 'Viewer', description: 'Read-only — dashboard, instrument, dan riwayat maintenance' },
  });

  console.log('Seeding instrument types...');
  for (const type of INSTRUMENT_TYPES) {
    await prisma.instrumentType.upsert({
      where: { typeCode: type.typeCode },
      update: {},
      create: type,
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

  const ptType = await prisma.instrumentType.findUnique({ where: { typeCode: 'PT' } });
  if (ptType) {
    await prisma.instrument.upsert({
      where: { tagNumber: 'PT-1001' },
      update: {},
      create: {
        tagNumber: 'PT-1001',
        instrumentName: 'Pressure Transmitter Separator Inlet',
        areaId: area.id,
        instrumentTypeId: ptType.id,
        manufacturer: 'Yokogawa',
        model: 'EJA430E',
        status: InstrumentStatus.ACTIVE,
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
