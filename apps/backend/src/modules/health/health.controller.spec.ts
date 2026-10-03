import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  function buildController(queryRawImpl: () => Promise<unknown>) {
    const prisma = { $queryRaw: jest.fn().mockImplementation(queryRawImpl) } as unknown as PrismaService;
    return new HealthController(prisma);
  }

  it('mengembalikan status ok & database up kalau query ke DB berhasil', async () => {
    const controller = buildController(() => Promise.resolve([{ '?column?': 1 }]));

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(typeof result.timestamp).toBe('string');
  });

  it('melempar ServiceUnavailableException (503) kalau query ke DB gagal', async () => {
    const controller = buildController(() => Promise.reject(new Error('connection pool exhausted')));

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });
});
