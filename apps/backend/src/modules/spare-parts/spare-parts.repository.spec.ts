import { BadRequestException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { SparePartsRepository } from './spare-parts.repository';
import { todayInOperationalZone } from './stock-date.util';

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

describe('SparePartsRepository — tanggal transaksi (movementDate)', () => {
  const repository = new SparePartsRepository({} as any);

  it('movementDate eksplisit disimpan sebagai tanggal (date-only, UTC midnight)', async () => {
    const tx = buildTx({ id: 'sp-1', kimap: 'K-1', stock: 10 });

    await repository.recordMovement(tx, {
      sparePartId: 'sp-1',
      createdById: 'u-1',
      type: 'RESTOCK',
      quantityDelta: 5,
      movementDate: '2026-09-28',
    });

    const data = tx.sparePartStockMovement.create.mock.calls[0][0].data;
    expect(data.movementDate.toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });

  it('tanpa movementDate: default hari ini (zona waktu operasional)', async () => {
    const tx = buildTx({ id: 'sp-1', kimap: 'K-1', stock: 10 });

    await repository.recordMovement(tx, { sparePartId: 'sp-1', createdById: 'u-1', type: 'RESTOCK', quantityDelta: 1 });

    const data = tx.sparePartStockMovement.create.mock.calls[0][0].data;
    expect(data.movementDate).toBeInstanceOf(Date);
    expect(data.movementDate.toISOString().slice(0, 10)).toBe(todayInOperationalZone());
  });
});

describe('SparePartsRepository.findAllMovements', () => {
  function buildList() {
    const prisma = {
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
      sparePartStockMovement: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    return { repository: new SparePartsRepository(prisma as any), prisma };
  }

  const baseQuery = { skip: 0, limit: 20, page: 1, sortBy: 'createdAt', sortOrder: 'desc' } as any;

  it('types (Stock Out gabungan) menghasilkan filter type IN, mengalahkan type tunggal', async () => {
    const { repository, prisma } = buildList();

    await repository.findAllMovements({ ...baseQuery, types: ['STOCK_OUT', 'MAINTENANCE_USAGE'] });

    expect(prisma.sparePartStockMovement.findMany.mock.calls[0][0].where.type).toEqual({
      in: ['STOCK_OUT', 'MAINTENANCE_USAGE'],
    });
  });

  it('filter tanggal memakai movementDate (bukan createdAt), inklusif di kedua ujung', async () => {
    const { repository, prisma } = buildList();

    await repository.findAllMovements({ ...baseQuery, type: 'RESTOCK', dateFrom: '2026-09-01', dateTo: '2026-09-30' });

    const where = prisma.sparePartStockMovement.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('createdAt');
    expect(where.movementDate.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(where.movementDate.lte.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });

  it('urutan default: tanggal transaksi dulu, lalu waktu input', async () => {
    const { repository, prisma } = buildList();

    await repository.findAllMovements({ ...baseQuery, type: 'RESTOCK' });

    expect(prisma.sparePartStockMovement.findMany.mock.calls[0][0].orderBy).toEqual([
      { movementDate: 'desc' },
      { createdAt: 'desc' },
    ]);
  });
});
