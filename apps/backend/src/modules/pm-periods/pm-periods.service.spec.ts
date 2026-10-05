import { ConflictException } from '@nestjs/common';
import { PmPeriodsService } from './pm-periods.service';

const PROGRAM_ID = 'program-1';

function period(overrides: Record<string, unknown> = {}) {
  return {
    id: 'period-1',
    pmProgramId: PROGRAM_ID,
    periodNumber: 2,
    plannedDate: new Date('2026-10-01'),
    remarks: null,
    createdAt: new Date(),
    executions: [],
    ...overrides,
  };
}

function build() {
  const repository = {
    getNextPeriodNumber: jest.fn().mockResolvedValue(5),
    findByNumber: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(period()),
    createWithExecutions: jest.fn().mockResolvedValue({ id: 'period-new' }),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const programsService = {
    findOne: jest.fn().mockResolvedValue({ checklistItems: [], equipment: [{ id: 'eq-1' }] }),
  };
  const service = new PmPeriodsService(repository as any, programsService as any);
  return { service, repository, programsService };
}

describe('PmPeriodsService.createPeriod', () => {
  it('tanpa periodNumber: otomatis memakai nomor berikutnya', async () => {
    const { service, repository } = build();

    await service.createPeriod(PROGRAM_ID, { plannedDate: '2026-11-01' });

    expect(repository.createWithExecutions.mock.calls[0][1]).toBe(5);
    expect(repository.findByNumber).not.toHaveBeenCalled();
  });

  it('dengan periodNumber manual: memakai nomor itu setelah dicek tidak bentrok', async () => {
    const { service, repository } = build();

    await service.createPeriod(PROGRAM_ID, { periodNumber: 12, plannedDate: '2026-11-01' });

    expect(repository.findByNumber).toHaveBeenCalledWith(PROGRAM_ID, 12);
    expect(repository.getNextPeriodNumber).not.toHaveBeenCalled();
    expect(repository.createWithExecutions.mock.calls[0][1]).toBe(12);
  });

  it('menolak nomor yang sudah dipakai periode aktif (409)', async () => {
    const { service, repository } = build();
    repository.findByNumber.mockResolvedValue({ id: 'other', deletedAt: null });

    await expect(service.createPeriod(PROGRAM_ID, { periodNumber: 3, plannedDate: '2026-11-01' })).rejects.toThrow(
      /sudah dipakai periode lain/,
    );
    expect(repository.createWithExecutions).not.toHaveBeenCalled();
  });

  it('menolak nomor yang dipegang periode soft-deleted dengan pesan yang menjelaskan', async () => {
    const { service, repository } = build();
    repository.findByNumber.mockResolvedValue({ id: 'gone', deletedAt: new Date() });

    await expect(service.createPeriod(PROGRAM_ID, { periodNumber: 3, plannedDate: '2026-11-01' })).rejects.toThrow(
      /sudah dihapus/,
    );
  });
});

describe('PmPeriodsService.update', () => {
  it('mengubah nomor periode ke nomor yang bebas', async () => {
    const { service, repository } = build();

    await service.update('period-1', { periodNumber: 9 });

    expect(repository.findByNumber).toHaveBeenCalledWith(PROGRAM_ID, 9);
    expect(repository.update).toHaveBeenCalledWith('period-1', { periodNumber: 9 });
  });

  it('menolak nomor yang sudah dipakai periode lain (tidak ada swap diam-diam)', async () => {
    const { service, repository } = build();
    repository.findByNumber.mockResolvedValue({ id: 'other', deletedAt: null });

    await expect(service.update('period-1', { periodNumber: 3 })).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('PATCH yang mengirim nomor lama (tidak berubah) tidak dicek bentrok', async () => {
    const { service, repository } = build();

    await service.update('period-1', { periodNumber: 2, remarks: 'revisi' });

    expect(repository.findByNumber).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
  });

  it('mengubah tanggal/remarks saja tidak menyentuh pengecekan nomor', async () => {
    const { service, repository } = build();

    await service.update('period-1', { plannedDate: '2026-12-01' });

    expect(repository.findByNumber).not.toHaveBeenCalled();
  });
});

describe('PmPeriodsService.getNextPeriodNumber', () => {
  it('mengembalikan nomor otomatis berikutnya', async () => {
    const { service } = build();

    expect(await service.getNextPeriodNumber(PROGRAM_ID)).toEqual({ nextPeriodNumber: 5 });
  });
});
