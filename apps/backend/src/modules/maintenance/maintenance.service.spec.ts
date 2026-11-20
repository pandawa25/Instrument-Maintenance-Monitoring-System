import { BadRequestException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

const CM_ID = 'cm-1';

function build(currentStatus: string) {
  const repository = {
    findById: jest.fn().mockResolvedValue({
      id: CM_ID,
      status: currentStatus,
      materials: [],
      additionalTechnicians: [],
    }),
    setHighlighted: jest.fn().mockResolvedValue(undefined),
  };
  const service = new MaintenanceService(repository as any, {} as any, {} as any, {} as any, {} as any);
  return { service, repository };
}

describe('MaintenanceService.setHighlighted — fitur Highlight Pekerjaan', () => {
  it.each(['OPEN', 'IN_PROGRESS', 'WAITING_MATERIAL'])(
    'menandai (true) CM berstatus %s: diizinkan',
    async (status) => {
      const { service, repository } = build(status);

      await service.setHighlighted(CM_ID, true);

      expect(repository.setHighlighted).toHaveBeenCalledWith(CM_ID, true);
    },
  );

  it.each(['COMPLETED', 'CANCELLED'])('menandai (true) CM berstatus %s: ditolak', async (status) => {
    const { service, repository } = build(status);

    await expect(service.setHighlighted(CM_ID, true)).rejects.toThrow(BadRequestException);
    expect(repository.setHighlighted).not.toHaveBeenCalled();
  });

  it.each(['OPEN', 'COMPLETED', 'CANCELLED'])('membatalkan tanda (false) selalu diizinkan — status %s', async (status) => {
    const { service, repository } = build(status);

    await service.setHighlighted(CM_ID, false);

    expect(repository.setHighlighted).toHaveBeenCalledWith(CM_ID, false);
  });
});
