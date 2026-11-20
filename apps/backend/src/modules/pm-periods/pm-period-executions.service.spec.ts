import { BadRequestException } from '@nestjs/common';
import { PmPeriodExecutionsService } from './pm-period-executions.service';

const EXEC_ID = 'exec-1';

function build(currentStatus: string) {
  const repository = {
    findById: jest.fn().mockResolvedValue({ id: EXEC_ID, status: currentStatus, checklistResults: [] }),
    setHighlighted: jest.fn().mockResolvedValue({ id: EXEC_ID, status: currentStatus, checklistResults: [] }),
  };
  const service = new PmPeriodExecutionsService(repository as any);
  return { service, repository };
}

describe('PmPeriodExecutionsService.setHighlighted — fitur Highlight Pekerjaan', () => {
  it('menandai (true) eksekusi berstatus PENDING: diizinkan', async () => {
    const { service, repository } = build('PENDING');

    await service.setHighlighted(EXEC_ID, true);

    expect(repository.setHighlighted).toHaveBeenCalledWith(EXEC_ID, true);
  });

  it('menandai (true) eksekusi berstatus COMPLETED: ditolak', async () => {
    const { service, repository } = build('COMPLETED');

    await expect(service.setHighlighted(EXEC_ID, true)).rejects.toThrow(BadRequestException);
    expect(repository.setHighlighted).not.toHaveBeenCalled();
  });

  it('membatalkan tanda (false) pada eksekusi Completed: tetap diizinkan', async () => {
    const { service, repository } = build('COMPLETED');

    await service.setHighlighted(EXEC_ID, false);

    expect(repository.setHighlighted).toHaveBeenCalledWith(EXEC_ID, false);
  });
});
