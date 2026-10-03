import { BadRequestException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { SparePartsRepository } from './spare-parts.repository';

// recordMovement() menerima `tx` generik (bisa PrismaService atau transaction
// client) — untuk unit test cukup mock 3 method Prisma yang benar-benar dipakai,
// tidak perlu database sungguhan. `stock` di-mock sebagai instance Decimal,
// persis seperti yang benar-benar dikembalikan Prisma untuk kolom Decimal
// (sejak migrasi SparePart.stock dari Int ke Decimal, lihat docs/roadmap.md
// Risk #1).
function buildTx(sparePart: { id: string; kimap: string; stock: number } | null) {
  return {
    sparePart: {
      findUnique: jest
        .fn()
        .mockResolvedValue(sparePart ? { ...sparePart, stock: new Decimal(sparePart.stock) } : null),
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

    expect(balanceAfter.toNumber()).toBe(15);

    const updateCall = tx.sparePart.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: 'sp-1' });
    expect(updateCall.data.stock.toNumber()).toBe(15);

    const createCall = tx.sparePartStockMovement.create.mock.calls[0][0];
    expect(createCall.data.sparePartId).toBe('sp-1');
    expect(createCall.data.type).toBe('RESTOCK');
    expect(createCall.data.quantityDelta.toNumber()).toBe(5);
    expect(createCall.data.balanceAfter.toNumber()).toBe(15);
  });

  it('mengurangi stock dengan benar untuk quantityDelta negatif (mis. MAINTENANCE_USAGE)', async () => {
    const tx = buildTx({ id: 'sp-1', kimap: 'KIMAP-001', stock: 10 });

    const balanceAfter = await repository.recordMovement(tx, {
      ...baseParams,
      type: 'MAINTENANCE_USAGE',
      quantityDelta: -3,
    });

    expect(balanceAfter.toNumber()).toBe(7);
  });

  it('mendukung quantityDelta pecahan (part satuan non-bulat, mis. meter kabel)', async () => {
    const tx = buildTx({ id: 'sp-1', kimap: 'KIMAP-KABEL', stock: 10.5 });

    const balanceAfter = await repository.recordMovement(tx, {
      ...baseParams,
      type: 'MAINTENANCE_USAGE',
      quantityDelta: -2.25,
    });

    // Sebelum migrasi ke Decimal, ini akan dibulatkan (Math.round) di pemanggil
    // dan kehilangan presisi — sekarang harus tersimpan persis 8.25.
    expect(balanceAfter.toNumber()).toBe(8.25);
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
