import { DashboardService } from './dashboard.service';

// getKpi murni fungsi kalkulasi di atas data dari repository — di-mock semua
// biar test fokus ke logika MTTR/MTBF/PM Compliance, bukan Prisma.
function buildRepository(opts: {
  failures?: any[];
  pmExecutions?: any[];
  areaLookup?: Map<string, { id: string; areaCode: string; areaName: string }>;
}) {
  return {
    getFailuresInPeriod: jest.fn().mockResolvedValue(opts.failures ?? []),
    getPmExecutionsInPeriod: jest.fn().mockResolvedValue(opts.pmExecutions ?? []),
    getAreaLookup: jest.fn().mockResolvedValue(opts.areaLookup ?? new Map()),
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
