import { DashboardService } from './dashboard.service';

// getKpi murni fungsi kalkulasi di atas data dari repository — di-mock semua
// biar test fokus ke logika MTTR/MTBF/PM Compliance, bukan Prisma.
function buildRepository(opts: {
  failures?: any[];
  pmExecutions?: any[];
  areaLookup?: Map<string, { id: string; areaCode: string; areaName: string }>;
  equipmentList?: any[];
}) {
  return {
    getFailuresInPeriod: jest.fn().mockResolvedValue(opts.failures ?? []),
    getPmExecutionsInPeriod: jest.fn().mockResolvedValue(opts.pmExecutions ?? []),
    getAreaLookup: jest.fn().mockResolvedValue(opts.areaLookup ?? new Map()),
    getActiveEquipmentForHealthIndex: jest.fn().mockResolvedValue(opts.equipmentList ?? []),
  };
}

const AREA_A = { id: 'area-1', areaCode: 'AREA-A', areaName: 'Area A' };

describe('DashboardService.getKpi', () => {
  it('MTTR = rata-rata downtimeHours dari kejadian gagal yang completed', async () => {
    const failures = [
      {
        maintenanceDate: new Date('2026-01-05'),
        downtimeHours: 4,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
      {
        maintenanceDate: new Date('2026-02-05'),
        downtimeHours: 2,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
    ];
    const repo = buildRepository({ failures, areaLookup: new Map([[AREA_A.id, AREA_A]]) });
    const service = new DashboardService(repo as any);

    const result = await service.getKpi(12);

    expect(result.overall.mttr).toBe(3); // (4+2)/2
    expect(result.overall.totalFailures).toBe(2);
  });

  it('MTTR mengabaikan kejadian tanpa downtimeHours (null)', async () => {
    const failures = [
      {
        maintenanceDate: new Date('2026-01-05'),
        downtimeHours: null,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
      {
        maintenanceDate: new Date('2026-02-05'),
        downtimeHours: 6,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
    ];
    const repo = buildRepository({ failures, areaLookup: new Map([[AREA_A.id, AREA_A]]) });
    const service = new DashboardService(repo as any);

    const result = await service.getKpi(12);

    expect(result.overall.mttr).toBe(6); // hanya 1 data valid, bukan (0+6)/2
  });

  it('MTBF = rata-rata interval hari antar kegagalan berurutan per equipment', async () => {
    const failures = [
      {
        maintenanceDate: new Date('2026-01-01'),
        downtimeHours: 1,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
      {
        maintenanceDate: new Date('2026-01-11'), // +10 hari
        downtimeHours: 1,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
      {
        maintenanceDate: new Date('2026-01-21'), // +10 hari lagi
        downtimeHours: 1,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
    ];
    const repo = buildRepository({ failures, areaLookup: new Map([[AREA_A.id, AREA_A]]) });
    const service = new DashboardService(repo as any);

    const result = await service.getKpi(12);

    expect(result.overall.mtbf).toBe(10);
    expect(result.byInstrument[0].mtbf).toBe(10);
  });

  it('MTBF null kalau equipment cuma punya 1 kejadian gagal dalam periode', async () => {
    const failures = [
      {
        maintenanceDate: new Date('2026-01-01'),
        downtimeHours: 1,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
    ];
    const repo = buildRepository({ failures, areaLookup: new Map([[AREA_A.id, AREA_A]]) });
    const service = new DashboardService(repo as any);

    const result = await service.getKpi(12);

    expect(result.overall.mtbf).toBeNull();
  });

  it('PM Compliance Rate = completed / total eksekusi PM dalam periode', async () => {
    const pmExecutions = [
      { status: 'COMPLETED', equipmentId: 'eq-1', equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id } },
      { status: 'COMPLETED', equipmentId: 'eq-1', equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id } },
      { status: 'PENDING', equipmentId: 'eq-1', equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id } },
      { status: 'PENDING', equipmentId: 'eq-1', equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id } },
    ];
    const repo = buildRepository({ pmExecutions, areaLookup: new Map([[AREA_A.id, AREA_A]]) });
    const service = new DashboardService(repo as any);

    const result = await service.getKpi(12);

    expect(result.overall.pmComplianceRate).toBe(50);
    expect(result.overall.totalPmScheduled).toBe(4);
  });

  it('pmComplianceRate null kalau tidak ada PM terjadwal sama sekali dalam periode', async () => {
    const repo = buildRepository({});
    const service = new DashboardService(repo as any);

    const result = await service.getKpi(12);

    expect(result.overall.pmComplianceRate).toBeNull();
    expect(result.overall.mttr).toBeNull();
    expect(result.overall.mtbf).toBeNull();
  });

  it('mengelompokkan hasil per Area dan per Instrument secara terpisah dari overall', async () => {
    const AREA_B = { id: 'area-2', areaCode: 'AREA-B', areaName: 'Area B' };
    const failures = [
      {
        maintenanceDate: new Date('2026-01-01'),
        downtimeHours: 2,
        equipmentId: 'eq-1',
        equipment: { tagNumber: 'PT-001', service: 'Pressure', areaId: AREA_A.id },
      },
      {
        maintenanceDate: new Date('2026-01-02'),
        downtimeHours: 8,
        equipmentId: 'eq-2',
        equipment: { tagNumber: 'FT-001', service: 'Flow', areaId: AREA_B.id },
      },
    ];
    const repo = buildRepository({
      failures,
      areaLookup: new Map([
        [AREA_A.id, AREA_A],
        [AREA_B.id, AREA_B],
      ]),
    });
    const service = new DashboardService(repo as any);

    const result = await service.getKpi(12);

    expect(result.overall.mttr).toBe(5); // (2+8)/2
    expect(result.byArea).toHaveLength(2);
    expect(result.byArea.find((a) => a.areaCode === 'AREA-A')?.mttr).toBe(2);
    expect(result.byArea.find((a) => a.areaCode === 'AREA-B')?.mttr).toBe(8);
    expect(result.byInstrument).toHaveLength(2);
  });

  it('default rentang 12 bulan kalau parameter months tidak dikirim', async () => {
    const repo = buildRepository({});
    const service = new DashboardService(repo as any);

    const result = await service.getKpi();

    expect(result.period.months).toBe(12);
  });
});

describe('DashboardService.getHealthIndex', () => {
  const eqReliable = { id: 'eq-good', tagNumber: 'PT-GOOD', service: 'Pressure', areaId: AREA_A.id, criticality: 'MEDIUM' };
  const eqPoor = { id: 'eq-poor', tagNumber: 'PT-POOR', service: 'Pressure', areaId: AREA_A.id, criticality: 'MEDIUM' };
  const eqIdle = { id: 'eq-idle', tagNumber: 'PT-IDLE', service: 'Pressure', areaId: AREA_A.id, criticality: 'MEDIUM' };

  it('equipment tanpa riwayat kegagalan ditandai INSUFFICIENT_DATA, bukan skor tinggi', async () => {
    const repo = buildRepository({
      equipmentList: [eqIdle],
      failures: [],
      areaLookup: new Map([[AREA_A.id, AREA_A]]),
    });
    const service = new DashboardService(repo as any);

    const result = await service.getHealthIndex(12);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].category).toBe('INSUFFICIENT_DATA');
    expect(result.items[0].healthScore).toBeNull();
    expect(result.summary.insufficientData).toBe(1);
  });

  it('equipment dengan MTTR & failure count lebih buruk dari peer mendapat skor lebih rendah', async () => {
    const failures = [
      // eq-good: 1 kejadian, downtime kecil
      {
        maintenanceDate: new Date('2026-01-05'),
        downtimeHours: 1,
        equipmentId: 'eq-good',
        equipment: { tagNumber: 'PT-GOOD', service: 'Pressure', areaId: AREA_A.id },
      },
      // eq-poor: 3 kejadian, downtime besar
      {
        maintenanceDate: new Date('2026-01-05'),
        downtimeHours: 10,
        equipmentId: 'eq-poor',
        equipment: { tagNumber: 'PT-POOR', service: 'Pressure', areaId: AREA_A.id },
      },
      {
        maintenanceDate: new Date('2026-02-05'),
        downtimeHours: 12,
        equipmentId: 'eq-poor',
        equipment: { tagNumber: 'PT-POOR', service: 'Pressure', areaId: AREA_A.id },
      },
      {
        maintenanceDate: new Date('2026-03-05'),
        downtimeHours: 9,
        equipmentId: 'eq-poor',
        equipment: { tagNumber: 'PT-POOR', service: 'Pressure', areaId: AREA_A.id },
      },
    ];
    const repo = buildRepository({
      equipmentList: [eqReliable, eqPoor],
      failures,
      areaLookup: new Map([[AREA_A.id, AREA_A]]),
    });
    const service = new DashboardService(repo as any);

    const result = await service.getHealthIndex(12);

    const good = result.items.find((i) => i.equipmentId === 'eq-good')!;
    const poor = result.items.find((i) => i.equipmentId === 'eq-poor')!;

    expect(good.hasEnoughData).toBe(true);
    expect(poor.hasEnoughData).toBe(true);
    expect(good.healthScore!).toBeGreaterThan(poor.healthScore!);
    // Item terurut dari skor paling rendah (paling urgent) dulu
    expect(result.items[0].equipmentId).toBe('eq-poor');
  });

  it('criticality HIGH memperberat skor akhir dibanding LOW untuk performa reliability yang identik', async () => {
    const failuresFor = (equipmentId: string) => [
      { maintenanceDate: new Date('2026-01-01'), downtimeHours: 5, equipmentId, equipment: { tagNumber: equipmentId, service: 'X', areaId: AREA_A.id } },
      { maintenanceDate: new Date('2026-02-01'), downtimeHours: 5, equipmentId, equipment: { tagNumber: equipmentId, service: 'X', areaId: AREA_A.id } },
    ];
    const eqHigh = { id: 'eq-high', tagNumber: 'eq-high', service: 'X', areaId: AREA_A.id, criticality: 'HIGH' };
    const eqLow = { id: 'eq-low', tagNumber: 'eq-low', service: 'X', areaId: AREA_A.id, criticality: 'LOW' };

    const repo = buildRepository({
      equipmentList: [eqHigh, eqLow],
      failures: [...failuresFor('eq-high'), ...failuresFor('eq-low')],
      areaLookup: new Map([[AREA_A.id, AREA_A]]),
    });
    const service = new DashboardService(repo as any);

    const result = await service.getHealthIndex(12);

    const high = result.items.find((i) => i.equipmentId === 'eq-high')!;
    const low = result.items.find((i) => i.equipmentId === 'eq-low')!;

    // Base reliability score sama persis (data identik) tapi HIGH criticality
    // harus menghasilkan skor akhir <= LOW criticality kalau base score < 100.
    expect(high.healthScore!).toBeLessThanOrEqual(low.healthScore!);
  });

  it('kategori mengikuti threshold skor (GOOD/FAIR/POOR/CRITICAL)', async () => {
    // Satu-satunya equipment scorable -> otomatis jadi percentile terbaik (skor 100)
    const repo = buildRepository({
      equipmentList: [eqReliable],
      failures: [
        {
          maintenanceDate: new Date('2026-01-01'),
          downtimeHours: 1,
          equipmentId: 'eq-good',
          equipment: { tagNumber: 'PT-GOOD', service: 'Pressure', areaId: AREA_A.id },
        },
      ],
      areaLookup: new Map([[AREA_A.id, AREA_A]]),
    });
    const service = new DashboardService(repo as any);

    const result = await service.getHealthIndex(12);

    expect(result.items[0].category).toBe('GOOD');
    expect(result.items[0].healthScore).toBe(100);
  });
});
