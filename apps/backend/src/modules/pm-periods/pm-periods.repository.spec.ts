import { PmPeriodsRepository } from './pm-periods.repository';

function buildRepository() {
  const tx = {
    pmPeriod: {
      create: jest.fn().mockResolvedValue({ id: 'period-1' }),
      findFirst: jest.fn().mockResolvedValue({ id: 'period-1', executions: [] }),
    },
    pmPeriodExecution: { create: jest.fn(), createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    pmExecutionChecklistResult: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    pmPeriod: { findFirst: jest.fn() },
  };
  return { repository: new PmPeriodsRepository(prisma as any), prisma, tx };
}

const TEMPLATE = [
  { activityTypeName: 'Kalibrasi', description: null, sortOrder: 0 },
  { activityTypeName: 'Cek Visual', description: 'Cek kondisi fisik', sortOrder: 1 },
];

describe('PmPeriodsRepository.createWithExecutions', () => {
  it('insert execution & checklist lewat createMany (bukan create per equipment) dan memakai timeout transaksi 30 detik', async () => {
    const { repository, prisma, tx } = buildRepository();
    const equipmentIds = Array.from({ length: 150 }, (_, i) => `eq-${i}`);

    await repository.createWithExecutions('program-1', 1, '2026-10-05', undefined, equipmentIds, TEMPLATE);

    expect(tx.pmPeriodExecution.create).not.toHaveBeenCalled();
    expect(tx.pmPeriodExecution.createMany).toHaveBeenCalledTimes(1);
    expect(tx.pmPeriodExecution.createMany.mock.calls[0][0].data).toHaveLength(150);
    // 150 equipment x 2 checklist item = 300 baris checklist, masih 1 chunk
    expect(tx.pmExecutionChecklistResult.createMany).toHaveBeenCalledTimes(1);
    expect(tx.pmExecutionChecklistResult.createMany.mock.calls[0][0].data).toHaveLength(300);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ timeout: 30_000 }));
  });

  it('checklist result mengacu ke id execution yang di-generate (relasi tidak putus)', async () => {
    const { repository, tx } = buildRepository();

    await repository.createWithExecutions('program-1', 1, '2026-10-05', undefined, ['eq-1', 'eq-2'], TEMPLATE);

    const executionIds = tx.pmPeriodExecution.createMany.mock.calls[0][0].data.map((e: { id: string }) => e.id);
    const checklistParentIds = new Set(
      tx.pmExecutionChecklistResult.createMany.mock.calls[0][0].data.map(
        (c: { pmPeriodExecutionId: string }) => c.pmPeriodExecutionId,
      ),
    );
    expect(new Set(executionIds).size).toBe(2);
    expect([...checklistParentIds].sort()).toEqual([...executionIds].sort());
  });

  it('memecah insert menjadi beberapa chunk kalau barisnya sangat banyak', async () => {
    const { repository, tx } = buildRepository();
    const equipmentIds = Array.from({ length: 1200 }, (_, i) => `eq-${i}`);

    await repository.createWithExecutions('program-1', 1, '2026-10-05', undefined, equipmentIds, TEMPLATE);

    expect(tx.pmPeriodExecution.createMany).toHaveBeenCalledTimes(2); // 1000 + 200
    expect(tx.pmExecutionChecklistResult.createMany).toHaveBeenCalledTimes(3); // 2400 baris -> 1000+1000+400
  });

  it('tidak memanggil createMany checklist kalau program tidak punya checklist item', async () => {
    const { repository, tx } = buildRepository();

    await repository.createWithExecutions('program-1', 1, '2026-10-05', undefined, ['eq-1'], []);

    expect(tx.pmExecutionChecklistResult.createMany).not.toHaveBeenCalled();
  });
});

describe('PmPeriodsRepository.getNextPeriodNumber', () => {
  it('menghitung periode soft-deleted juga, supaya nomor tidak dipakai ulang dan bentrok dengan unique constraint', async () => {
    const { repository, prisma } = buildRepository();
    prisma.pmPeriod.findFirst.mockResolvedValue({ periodNumber: 4 });

    const next = await repository.getNextPeriodNumber('program-1');

    expect(next).toBe(5);
    const where = prisma.pmPeriod.findFirst.mock.calls[0][0].where;
    expect(where).toEqual({ pmProgramId: 'program-1' });
    expect(where).not.toHaveProperty('deletedAt');
  });

  it('mulai dari 1 kalau program belum punya periode', async () => {
    const { repository, prisma } = buildRepository();
    prisma.pmPeriod.findFirst.mockResolvedValue(null);

    expect(await repository.getNextPeriodNumber('program-1')).toBe(1);
  });
});
