import { BadRequestException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';

const WO_ID = 'wo-1';

function build(currentStage: string) {
  const repository = {
    findById: jest.fn().mockResolvedValue({ id: WO_ID, lifecycleStage: currentStage }),
    setHighlighted: jest.fn().mockResolvedValue({ id: WO_ID, lifecycleStage: currentStage, isHighlighted: true }),
  };
  const equipmentService = {};
  const service = new WorkOrdersService(repository as any, equipmentService as any);
  return { service, repository };
}

describe('WorkOrdersService.setHighlighted — fitur Highlight Pekerjaan', () => {
  it.each(['CREATED', 'RELEASED', 'TECHNICALLY_COMPLETED'])('menandai (true) WO stage %s: diizinkan', async (stage) => {
    const { service, repository } = build(stage);

    await service.setHighlighted(WO_ID, true);

    expect(repository.setHighlighted).toHaveBeenCalledWith(WO_ID, true);
  });

  it('menandai (true) WO stage CLOSED: ditolak', async () => {
    const { service, repository } = build('CLOSED');

    await expect(service.setHighlighted(WO_ID, true)).rejects.toThrow(BadRequestException);
    expect(repository.setHighlighted).not.toHaveBeenCalled();
  });

  it('membatalkan tanda (false) pada WO Closed: tetap diizinkan', async () => {
    const { service, repository } = build('CLOSED');

    await service.setHighlighted(WO_ID, false);

    expect(repository.setHighlighted).toHaveBeenCalledWith(WO_ID, false);
  });
});
