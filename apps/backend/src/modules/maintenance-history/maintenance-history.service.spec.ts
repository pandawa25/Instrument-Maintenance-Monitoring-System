// Service hanya memakai repository (di-mock); stub client Prisma supaya spec tidak butuh `prisma generate`.
jest.mock('@prisma/client', () => ({ PrismaClient: class {}, Prisma: {} }));

import { NotFoundException } from '@nestjs/common';
import { MaintenanceHistoryService } from './maintenance-history.service';

const equipment = {
  id: 'eq-1',
  tagNumber: 'PT-101',
  service: 'Suction',
  installationDate: new Date('2020-01-15T00:00:00.000Z'),
};

function cmRow(id: string, date: string) {
  return {
    id,
    spkNumber: null,
    maintenanceDate: new Date(`${date}T00:00:00.000Z`),
    completionDate: null,
    failureCategory: 'INSTRUMENT',
    priority: 'LOW',
    status: 'COMPLETED',
    problemDescription: 'x',
    rootCause: null,
    actionTaken: null,
    downtimeHours: null,
    remarks: null,
    workOrderNumber: null,
    notificationNumber: null,
    createdAt: new Date(`${date}T01:00:00.000Z`),
    technician: { fullName: 'Budi' },
    additionalTechnicians: [],
    materials: [],
  };
}

function pmRow(id: string, date: string) {
  return {
    id,
    executionDate: new Date(`${date}T00:00:00.000Z`),
    result: 'OK',
    status: 'COMPLETED',
    findings: null,
    actionTaken: null,
    vendorPersonnel: null,
    remarks: null,
    workOrderNumber: null,
    createdAt: new Date(`${date}T02:00:00.000Z`),
    pmPeriod: { periodNumber: 1, plannedDate: new Date(`${date}T00:00:00.000Z`), pmProgram: { id: 'prog-a', name: 'PM A', vendor: null } },
    checklistResults: [],
  };
}

function build(opts: { equipment?: unknown; cm?: unknown[]; pm?: unknown[]; counts?: any } = {}) {
  const repo = {
    searchEquipment: jest.fn().mockResolvedValue([]),
    findEquipmentHeader: jest.fn().mockResolvedValue('equipment' in opts ? opts.equipment : equipment),
    findCorrective: jest.fn().mockResolvedValue(opts.cm ?? []),
    findPreventive: jest.fn().mockResolvedValue(opts.pm ?? []),
    countMaintenancePerEquipment: jest.fn().mockResolvedValue(opts.counts ?? { corrective: [], preventive: [] }),
    findEquipmentByIds: jest.fn().mockImplementation(async (ids: string[]) => ids.map((id) => ({ id, tagNumber: id.toUpperCase() }))),
  };
  return { service: new MaintenanceHistoryService(repo as any), repo };
}

describe('MaintenanceHistoryService', () => {
  it('equipment tidak ada -> 404 dan tidak query history', async () => {
    const { service, repo } = build({ equipment: null });
    await expect(service.getEquipmentHistory('eq-x', { type: 'ALL' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findCorrective).not.toHaveBeenCalled();
    expect(repo.findPreventive).not.toHaveBeenCalled();
  });

  it('menggabungkan CM + PM, terurut terbaru dulu, dengan summary & header equipment', async () => {
    const { service } = build({
      cm: [cmRow('cm-old', '2026-01-10'), cmRow('cm-new', '2026-09-10')],
      pm: [pmRow('pm-mid', '2026-05-01')],
    });
    const result = await service.getEquipmentHistory('eq-1', { type: 'ALL' });
    expect(result.events.map((e) => e.id)).toEqual(['cm-new', 'pm-mid', 'cm-old']);
    expect(result.summary).toMatchObject({ totalEvents: 3, correctiveCount: 2, preventiveCount: 1 });
    expect(result.equipment.installationDate).toBe('2020-01-15');
  });

  it('type=CORRECTIVE tidak memanggil query PM; type=PREVENTIVE tidak memanggil query CM', async () => {
    const a = build({ cm: [cmRow('c', '2026-01-01')] });
    await a.service.getEquipmentHistory('eq-1', { type: 'CORRECTIVE' });
    expect(a.repo.findPreventive).not.toHaveBeenCalled();

    const b = build({ pm: [pmRow('p', '2026-01-01')] });
    const res = await b.service.getEquipmentHistory('eq-1', { type: 'PREVENTIVE' });
    expect(b.repo.findCorrective).not.toHaveBeenCalled();
    expect(res.events.map((e) => e.id)).toEqual(['p']);
  });

  it('rentang tanggal: diteruskan ke query CM dan difilter untuk PM (inklusif)', async () => {
    const { service, repo } = build({
      cm: [cmRow('c', '2026-03-01')],
      pm: [pmRow('p-in', '2026-03-15'), pmRow('p-out', '2026-06-01')],
    });
    const res = await service.getEquipmentHistory('eq-1', {
      type: 'ALL',
      dateFrom: '2026-03-01T00:00:00.000Z',
      dateTo: '2026-03-31',
    });
    expect(repo.findCorrective).toHaveBeenCalledWith('eq-1', '2026-03-01', '2026-03-31');
    expect(res.events.map((e) => e.id).sort()).toEqual(['c', 'p-in']);
  });

  it('tanpa riwayat sama sekali -> events kosong, summary nol (bukan error)', async () => {
    const { service } = build();
    const res = await service.getEquipmentHistory('eq-1', { type: 'ALL' });
    expect(res.events).toEqual([]);
    expect(res.summary.totalEvents).toBe(0);
  });
});

describe('MaintenanceHistoryService.getTopEquipment', () => {
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

  it('menggabungkan CM + PM per equipment, urut total terbanyak, tie-break kegiatan terakhir terbaru', async () => {
    const { service } = build({
      counts: {
        corrective: [
          { equipmentId: 'a', count: 3, lastDate: d('2026-09-01') },
          { equipmentId: 'b', count: 1, lastDate: d('2026-10-01') },
          { equipmentId: 'c', count: 2, lastDate: d('2026-08-01') },
        ],
        preventive: [
          { equipmentId: 'b', count: 2, lastDate: d('2026-10-10') },
          { equipmentId: 'c', count: 1, lastDate: d('2026-09-20') },
        ],
      },
    });
    const res = await service.getTopEquipment({ limit: 10 });
    // a=3, b=1+2=3, c=2+1=3 -> semua 3; tie-break last date: b(10-10) > c(09-20) > a(09-01)
    expect(res.map((r: any) => r.id)).toEqual(['b', 'c', 'a']);
    expect(res[0]).toMatchObject({ rank: 1, correctiveCount: 1, preventiveCount: 2, totalCount: 3, lastMaintenanceDate: '2026-10-10' });
  });

  it('dibatasi limit dan hanya mengambil data equipment untuk yang masuk Top N', async () => {
    const { service, repo } = build({
      counts: {
        corrective: ['a', 'b', 'c', 'd'].map((id, i) => ({ equipmentId: id, count: 10 - i, lastDate: null })),
        preventive: [],
      },
    });
    const res = await service.getTopEquipment({ limit: 2 });
    expect(res.map((r: any) => r.id)).toEqual(['a', 'b']);
    expect(repo.findEquipmentByIds).toHaveBeenCalledWith(['a', 'b']);
  });

  it('belum ada maintenance sama sekali -> array kosong tanpa query equipment', async () => {
    const { service, repo } = build();
    expect(await service.getTopEquipment({ limit: 10 })).toEqual([]);
    expect(repo.findEquipmentByIds).not.toHaveBeenCalled();
  });
});
