import { PmProgramsRepository } from './pm-programs.repository';

function build() {
  const prisma = {
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    pmProgram: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  return { repository: new PmProgramsRepository(prisma as any), prisma };
}

describe('PmProgramsRepository — total periode hanya periode aktif', () => {
  it('list: _count.periods difilter deletedAt null (periode soft-deleted tidak ikut dihitung)', async () => {
    const { repository, prisma } = build();

    await repository.findMany({ skip: 0, limit: 10 } as any);

    const include = prisma.pmProgram.findMany.mock.calls[0][0].include;
    expect(include._count.select.periods).toEqual({ where: { deletedAt: null } });
  });

  it('detail: _count.periods difilter deletedAt null', async () => {
    const { repository, prisma } = build();

    await repository.findById('program-1');

    const include = prisma.pmProgram.findFirst.mock.calls[0][0].include;
    expect(include._count.select.periods).toEqual({ where: { deletedAt: null } });
  });
});
