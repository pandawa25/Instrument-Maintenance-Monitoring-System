jest.mock('@prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, opts: { code: string }) {
      super(message);
      this.code = opts.code;
    }
  }
  return {
    PrismaClient: class {},
    EquipmentStatus: { ACTIVE: 'ACTIVE', STANDBY: 'STANDBY', OUT_OF_SERVICE: 'OUT_OF_SERVICE' },
    Criticality: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' },
    FailAction: { OPEN: 'OPEN', CLOSE: 'CLOSE', LAST: 'LAST' },
    Prisma: { PrismaClientKnownRequestError },
  };
});

import { Prisma } from '@prisma/client';
import { ServiceUnavailableException } from '@nestjs/common';
import { EquipmentBulkUploadService } from './equipment-bulk-upload.service';

const N = 997;

function updateRow(i: number) {
  return {
    action: 'UPDATE',
    targetEquipmentId: `eq-${i}`,
    payload: {
      resolved: { tagNumber: `PU-01-PT-${i}`, service: `svc ${i}`, areaId: 'a1', instrumentNameId: 'n1', status: 'STANDBY' },
    },
  };
}

function build(txOverrides: Record<string, unknown> = {}) {
  const tx = {
    equipment: {
      createMany: jest.fn(),
      findMany: jest.fn().mockImplementation(async ({ where }: any) =>
        where.id.in.map((id: string) => ({ id, deletedAt: null, tagNumber: id })),
      ),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    $executeRawUnsafe: jest.fn().mockImplementation(async (_sql: string, json: string) => JSON.parse(json).length),
    equipmentBulkOperation: { create: jest.fn() },
    equipmentChangeSnapshot: { createMany: jest.fn() },
    importBatch: { update: jest.fn() },
    ...txOverrides,
  };
  const prisma = { $transaction: jest.fn(async (fn: (t: typeof tx) => unknown, _opts: unknown) => fn(tx)) };
  const importBatchRepository = {
    findBatchById: jest
      .fn()
      .mockResolvedValueOnce({ id: 'b1', status: 'VALIDATED', errorRows: 0, expiresAt: new Date(Date.now() + 60_000) })
      .mockResolvedValue({ id: 'b1', status: 'COMMITTED', committedAt: new Date() }),
    findCommittableRows: jest.fn().mockResolvedValue(Array.from({ length: N }, (_, i) => updateRow(i))),
    updateStatus: jest.fn(),
  };
  const service = new EquipmentBulkUploadService(prisma as any, {} as any, importBatchRepository as any, {} as any, {} as any);
  return { service, tx, prisma, importBatchRepository };
}

describe('EquipmentBulkUploadService.commitBatch — batch besar', () => {
  it('997 baris UPDATE: 1 findMany + 2 statement raw (chunk 500), tanpa update per baris', async () => {
    const { service, tx, prisma } = build();

    const result = await service.commitBatch('b1', 'u1');

    expect(result.updatedCount).toBe(N);
    expect(tx.equipment.findMany).toHaveBeenCalledTimes(1);
    expect(tx.equipment.findUnique).not.toHaveBeenCalled();
    expect(tx.equipment.update).not.toHaveBeenCalled();
    expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(2); // 500 + 497
    const [sql, json] = tx.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('jsonb_to_recordset($1::jsonb)');
    const first = JSON.parse(json)[0];
    expect(first).toMatchObject({ id: 'eq-0', area_id: 'a1', instrument_name_id: 'n1', status: 'STANDBY', f: { status: true } });
    expect(first.manufacturer).toBeUndefined(); // kolom kosong tidak dikirim -> tidak disentuh
    expect(prisma.$transaction.mock.calls[0][1]).toMatchObject({ timeout: 120_000 });
  });

  it('jumlah baris terkena != jumlah dikirim: 409 & batch FAILED', async () => {
    const { service, importBatchRepository } = build({ $executeRawUnsafe: jest.fn().mockResolvedValue(3) });

    await expect(service.commitBatch('b1', 'u1')).rejects.toThrow(/hanya mengenai 3 dari 500/);
    expect(importBatchRepository.updateStatus).toHaveBeenCalledWith('b1', 'FAILED');
  });

  it('timeout transaksi (P2028): 503 jelas & batch TIDAK ditandai FAILED (bisa commit ulang)', async () => {
    const { service, importBatchRepository } = build({
      equipment: {
        createMany: jest.fn(),
        findMany: jest.fn().mockRejectedValue(new (Prisma as any).PrismaClientKnownRequestError('timeout', { code: 'P2028' })),
      },
    });

    await expect(service.commitBatch('b1', 'u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(importBatchRepository.updateStatus).not.toHaveBeenCalledWith('b1', 'FAILED');
  });

  it('target hilang sejak preview: 409 & batch FAILED (perilaku lama tetap)', async () => {
    const { service, importBatchRepository } = build({
      equipment: { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    });

    await expect(service.commitBatch('b1', 'u1')).rejects.toThrow(/sudah tidak ada/);
    expect(importBatchRepository.updateStatus).toHaveBeenCalledWith('b1', 'FAILED');
  });
});
