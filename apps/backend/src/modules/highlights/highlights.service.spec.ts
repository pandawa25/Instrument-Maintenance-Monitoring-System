import { HighlightsService } from './highlights.service';

const USER = { id: 'u-1', role: 'Teknisi', roleId: 'role-1' } as any;

const CM_ROW = {
  id: 'cm-1',
  maintenanceDate: new Date('2026-11-01'),
  problemDescription: 'Transmitter error',
  status: 'OPEN',
  equipment: { tagNumber: 'PT-001', service: 'Pressure' },
};
const PM_ROW = {
  id: 'pm-1',
  executionDate: new Date('2026-11-05'),
  status: 'PENDING',
  equipment: { tagNumber: 'TT-002', service: 'Temperature' },
  pmPeriod: { periodNumber: 3, pmProgram: { id: 'prog-1', name: 'PM Rutin TT' } },
};
const WO_ROW = {
  id: 'wo-1',
  orderNo: 'WO-123',
  description: 'Ganti seal valve',
  basicStartDate: new Date('2026-11-03'),
  lifecycleStage: 'RELEASED',
  equipment: { tagNumber: 'CV-003', service: 'Control Valve' },
};

function build({ canCm = true, canPm = true, canWo = true } = {}) {
  const repository = {
    findHighlightedCm: jest.fn().mockResolvedValue([CM_ROW]),
    findHighlightedPmExecution: jest.fn().mockResolvedValue([PM_ROW]),
    findHighlightedWorkOrder: jest.fn().mockResolvedValue([WO_ROW]),
  };
  const permissionsService = {
    hasPermission: jest.fn((_user: unknown, module: string) => {
      if (module === 'CORRECTIVE_MAINTENANCE') return Promise.resolve(canCm);
      if (module === 'PM_EXECUTION') return Promise.resolve(canPm);
      if (module === 'WORK_ORDER') return Promise.resolve(canWo);
      return Promise.resolve(false);
    }),
  };
  const service = new HighlightsService(repository as any, permissionsService as any);
  return { service, repository, permissionsService };
}

describe('HighlightsService.findAll', () => {
  it('menggabungkan 3 sumber dan mengurutkan dari tanggal terbaru', async () => {
    const { service } = build();

    const result = await service.findAll(USER);

    expect(result.map((r) => r.id)).toEqual(['pm-1', 'wo-1', 'cm-1']); // 11-05, 11-03, 11-01
    expect(result[0]).toMatchObject({ type: 'PM_EXECUTION', linkTo: '/pm-programs/prog-1?openExecution=pm-1' });
  });

  it('user tanpa akses view WORK_ORDER: section WO tidak ikut dipanggil & tidak muncul di hasil', async () => {
    const { service, repository } = build({ canWo: false });

    const result = await service.findAll(USER);

    expect(repository.findHighlightedWorkOrder).not.toHaveBeenCalled();
    expect(result.find((r) => r.type === 'WORK_ORDER')).toBeUndefined();
    expect(result).toHaveLength(2);
  });

  it('user tanpa akses sama sekali (CM/PM/WO): hasil kosong, tidak ada query yang dipanggil', async () => {
    const { service, repository } = build({ canCm: false, canPm: false, canWo: false });

    const result = await service.findAll(USER);

    expect(result).toEqual([]);
    expect(repository.findHighlightedCm).not.toHaveBeenCalled();
    expect(repository.findHighlightedPmExecution).not.toHaveBeenCalled();
    expect(repository.findHighlightedWorkOrder).not.toHaveBeenCalled();
  });
});
