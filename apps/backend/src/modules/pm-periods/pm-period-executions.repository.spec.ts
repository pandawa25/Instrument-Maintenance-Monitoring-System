import { PmPeriodExecutionsRepository } from './pm-period-executions.repository';

const EXEC_ID = 'exec-1';

function build() {
  const tx = {
    pmPeriodExecution: {
      update: jest.fn().mockResolvedValue(undefined),
      findFirst: jest.fn().mockResolvedValue({ id: EXEC_ID }),
    },
    pmExecutionChecklistResult: { updateMany: jest.fn().mockResolvedValue(undefined) },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    pmPeriodExecution: {
      update: jest.fn().mockResolvedValue(undefined),
      findFirst: jest.fn().mockResolvedValue({ id: EXEC_ID }),
    },
  };
  const repository = new PmPeriodExecutionsRepository(prisma as any);
  return { repository, tx, prisma };
}

describe('PmPeriodExecutionsRepository.update — auto-clear Highlight Pekerjaan', () => {
  it('status berubah ke COMPLETED: isHighlighted ikut di-set false', async () => {
    const { repository, tx } = build();

    await repository.update(EXEC_ID, { status: 'COMPLETED' } as any);

    expect(tx.pmPeriodExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isHighlighted: false }) }),
    );
  });

  it('auto-complete (executionDate+result tanpa status eksplisit, resolusi di service): isHighlighted ikut false', async () => {
    const { repository, tx } = build();

    // Service yang me-resolve status jadi COMPLETED sebelum memanggil repository — di sini
    // langsung kirim payload yang sudah di-resolve, sesuai kontrak repository.update().
    await repository.update(EXEC_ID, { executionDate: '2026-11-01', result: 'OK', status: 'COMPLETED' } as any);

    expect(tx.pmPeriodExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isHighlighted: false }) }),
    );
  });

  it('update TANPA status (masih PENDING): isHighlighted TIDAK disentuh', async () => {
    const { repository, tx } = build();

    await repository.update(EXEC_ID, { findings: 'catatan' } as any);

    const callData = tx.pmPeriodExecution.update.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty('isHighlighted');
  });
});

describe('PmPeriodExecutionsRepository.setHighlighted', () => {
  it('meng-update is_highlighted lalu mengembalikan baris lengkap', async () => {
    const { repository, prisma } = build();
    (prisma.pmPeriodExecution.findFirst as jest.Mock).mockResolvedValue({ id: EXEC_ID, isHighlighted: true });

    const result = await repository.setHighlighted(EXEC_ID, true);

    expect(prisma.pmPeriodExecution.update).toHaveBeenCalledWith({
      where: { id: EXEC_ID },
      data: { isHighlighted: true },
    });
    expect(result).toEqual({ id: EXEC_ID, isHighlighted: true });
  });
});
