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

describe('SparePartsRepository.updateWithOpeningStock', () => {
  function build(opts: { stock: number; opening?: { id: string; qty: number } | null; later?: number[] }) {
    const created = new Date('2026-10-01T00:00:00Z');
    const tx = {
      sparePart: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sp-1', stock: new Decimal(opts.stock), createdAt: created }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      sparePartStockMovement: {
        findFirst: jest.fn().mockResolvedValue(
          opts.opening ? { id: opts.opening.id, quantityDelta: new Decimal(opts.opening.qty), createdAt: created } : null,
        ),
        findMany: jest.fn().mockResolvedValue((opts.later ?? []).map((b) => ({ balanceAfter: new Decimal(b) }))),
        updateMany: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const prisma = { $transaction: (fn: any) => fn(tx) };
    return { tx, repository: new SparePartsRepository(prisma as any) };
  }

  it('menaikkan saldo awal: geser balance sesudahnya + stock sebesar selisih', async () => {
    const { tx, repository } = build({ stock: 12, opening: { id: 'm-0', qty: 10 }, later: [15, 12] });
    await repository.updateWithOpeningStock('sp-1', {}, 20, 'u-1');
    expect(tx.sparePartStockMovement.updateMany.mock.calls[0][0].data.balanceAfter.increment.toNumber()).toBe(10);
    expect(tx.sparePartStockMovement.update.mock.calls[0][0].data).toMatchObject({ quantityDelta: 20, balanceAfter: 20 });
    expect(tx.sparePart.update.mock.calls[0][0].data.stock.increment.toNumber()).toBe(10);
    expect(tx.sparePartStockMovement.create).not.toHaveBeenCalled();
  });

  it('menurunkan saldo awal yang membuat saldo riwayat negatif → ditolak, tidak ada tulisan', async () => {
    const { tx, repository } = build({ stock: 3, opening: { id: 'm-0', qty: 10 }, later: [2, 3] });
    await expect(repository.updateWithOpeningStock('sp-1', {}, 5, 'u-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.sparePartStockMovement.updateMany).not.toHaveBeenCalled();
    expect(tx.sparePart.update).not.toHaveBeenCalled();
  });

  it('part tanpa baris saldo awal: dibuatkan baris INITIAL_BALANCE (backdate) dan semua baris digeser', async () => {
    const { tx, repository } = build({ stock: 4, opening: null, later: [5, 4] });
    await repository.updateWithOpeningStock('sp-1', {}, 8, 'u-1');
    expect(tx.sparePartStockMovement.create.mock.calls[0][0].data).toMatchObject({
      type: 'ADJUSTMENT',
      referenceType: 'INITIAL_BALANCE',
      quantityDelta: 8,
      balanceAfter: 8,
    });
    expect(tx.sparePartStockMovement.updateMany.mock.calls[0][0].data.balanceAfter.increment.toNumber()).toBe(8);
  });

  it('nilai tidak berubah: tidak menyentuh ledger/stock, hanya field master', async () => {
    const { tx, repository } = build({ stock: 10, opening: { id: 'm-0', qty: 10 } });
    await repository.updateWithOpeningStock('sp-1', { name: 'X' }, 10, 'u-1');
    expect(tx.sparePartStockMovement.updateMany).not.toHaveBeenCalled();
    expect(tx.sparePartStockMovement.update).not.toHaveBeenCalled();
    expect(tx.sparePart.update).toHaveBeenCalledTimes(1);
    expect(tx.sparePart.update.mock.calls[0][0].data).toEqual({ name: 'X' });
  });
});
