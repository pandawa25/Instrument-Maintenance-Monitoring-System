import { BadRequestException } from '@nestjs/common';
import { SparePartsRepository } from './spare-parts.repository';

// recordMovement() menerima `tx` generik (bisa PrismaService atau transaction
// client) — untuk unit test cukup mock 3 method Prisma yang benar-benar dipakai,
// tidak perlu database sungguhan.
function buildTx(sparePart: { id: string; kimap: string; stock: number } | null) {
  return {
    sparePart: {
      findUnique: jest.fn().mockResolvedValue(sparePart),
      update: jest.fn().mockResolvedValue(undefined),
    },
    sparePartStockMovement: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('SparePartsRepository.recordMovement', () => {
  // prisma asli tidak dipakai sama sekali di recordMovement (tx datang dari
  // parameter) — cukup diisi objek kosong untuk memenuhi constructor.
  const repository = new SparePartsRepository({} as any);

  const baseParams = {
    sparePartId: 'sp-1',
    createdById: 'user-1',
  };

  it('menambah stock dengan benar untuk quantityDelta positif (mis. RESTOCK)', async () => {
    const tx = buildTx({ id: 'sp-1', kimap: 'KIMAP-001', stock: 10 });

    const balanceAfter = await repository.recordMovement(tx, {
      ...baseParams,
      type: 'RESTOCK',
      quantityDelta: 5,
    });

    expect(balanceAfter).toBe(15);
    expect(tx.sparePart.update).toHaveBeenCalledWith({
      where: { id: 'sp-1' },
      data: { stock: 15 },
    });
    expect(tx.sparePartStockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sparePartId: 'sp-1',
        type: 'RESTOCK',
        quantityDelta: 5,
        balanceAfter: 15,
      }),
    });
  });

  it('mengurangi stock dengan benar untuk quantityDelta negatif (mis. MAINTENANCE_USAGE)', async () => {
    const tx = buildTx({ id: 'sp-1', kimap: 'KIMAP-001', stock: 10 });

    const balanceAfter = await repository.recordMovement(tx, {
      ...baseParams,
      type: 'MAINTENANCE_USAGE',
      quantityDelta: -3,
    });

    expect(balanceAfter).toBe(7);
  });

  it('menolak (BadRequestException) kalau hasil akhir stock akan negatif', async () => {
    const tx = buildTx({ id: 'sp-1', kimap: 'KIMAP-001', stock: 2 });

    await expect(
      repository.recordMovement(tx, { ...baseParams, type: 'MAINTENANCE_USAGE', quantityDelta: -5 }),
    ).rejects.toThrow(BadRequestException);

    // Stock TIDAK boleh berubah sama sekali kalau divalidasi gagal.
    expect(tx.sparePart.update).not.toHaveBeenCalled();
    expect(tx.sparePartStockMovement.create).not.toHaveBeenCalled();
  });

  it('menolak (BadRequestException) kalau spare part tidak ditemukan', async () => {
    const tx = buildTx(null);

    await expect(
      repository.recordMovement(tx, { ...baseParams, type: 'ADJUSTMENT', quantityDelta: 1 }),
    ).rejects.toThrow(BadRequestException);
  });
});
