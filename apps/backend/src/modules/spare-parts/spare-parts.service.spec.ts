import { BadRequestException } from '@nestjs/common';
import { SparePartsService } from './spare-parts.service';
import { resolveStockOutTypes } from './dto/query-all-stock-movements.dto';
import { todayInOperationalZone } from './stock-date.util';

function build() {
  const repository = {
    findById: jest.fn().mockResolvedValue({ id: 'sp-1', kimap: 'K', name: 'N', unit: 'pcs', stock: 5, minStock: 0, status: 'ACTIVE' }),
    createManualMovement: jest.fn().mockResolvedValue(undefined),
    findAllMovements: jest.fn(),
    findMaintenanceRefs: jest.fn().mockResolvedValue([]),
    getMonthlyStockInOut: jest.fn().mockResolvedValue([]),
    findLowStockItems: jest.fn().mockResolvedValue([]),
  };
  return { service: new SparePartsService(repository as any), repository };
}

function yesterday() {
  const d = new Date(`${todayInOperationalZone()}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
function tomorrow() {
  const d = new Date(`${todayInOperationalZone()}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe('resolveStockOutTypes', () => {
  it('ALL/default = Stock Out manual + pemakaian & pengembalian CM', () => {
    expect(resolveStockOutTypes()).toEqual(['STOCK_OUT', 'MAINTENANCE_USAGE', 'MAINTENANCE_RETURN']);
    expect(resolveStockOutTypes('ALL')).toEqual(['STOCK_OUT', 'MAINTENANCE_USAGE', 'MAINTENANCE_RETURN']);
  });
  it('MANUAL = hanya STOCK_OUT; MAINTENANCE = usage + return', () => {
    expect(resolveStockOutTypes('MANUAL')).toEqual(['STOCK_OUT']);
    expect(resolveStockOutTypes('MAINTENANCE')).toEqual(['MAINTENANCE_USAGE', 'MAINTENANCE_RETURN']);
  });
});

describe('SparePartsService.createMovement — tanggal transaksi', () => {
  it('menerima tanggal mundur (backdate) dan meneruskannya ke repository', async () => {
    const { service, repository } = build();

    await service.createMovement('sp-1', { type: 'RESTOCK', quantityDelta: 5, movementDate: yesterday() }, 'u-1');

    expect(repository.createManualMovement.mock.calls[0][0].movementDate).toBe(yesterday());
  });

  it('menolak tanggal di masa depan', async () => {
    const { service, repository } = build();

    await expect(
      service.createMovement('sp-1', { type: 'STOCK_OUT', quantityDelta: 1, movementDate: tomorrow() }, 'u-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createManualMovement).not.toHaveBeenCalled();
  });

  it('tanpa tanggal: movementDate undefined (repository mengisi hari ini)', async () => {
    const { service, repository } = build();

    await service.createMovement('sp-1', { type: 'RESTOCK', quantityDelta: 2 }, 'u-1');

    expect(repository.createManualMovement.mock.calls[0][0].movementDate).toBeUndefined();
  });
});

describe('SparePartsService.listAllMovements — sumber CM', () => {
  const row = (over: Record<string, unknown>) => ({
    id: 'm-1',
    type: 'MAINTENANCE_USAGE',
    quantityDelta: -2,
    balanceAfter: 3,
    movementDate: new Date('2026-10-02T00:00:00.000Z'),
    referenceType: 'CORRECTIVE_MAINTENANCE',
    referenceId: 'cm-1',
    notes: null,
    sparePart: { id: 'sp-1', kimap: 'K', name: 'N', unit: 'pcs' },
    createdBy: { id: 'u-1', fullName: 'U' },
    createdAt: new Date(),
    ...over,
  });

  it('baris dari CM mendapat reference berlabel No. e-SPK + tanggal transaksi yyyy-mm-dd; baris manual null', async () => {
    const { service, repository } = build();
    repository.findAllMovements.mockResolvedValue({
      rows: [row({}), row({ id: 'm-2', type: 'STOCK_OUT', referenceType: null, referenceId: null })],
      total: 2,
    });
    repository.findMaintenanceRefs.mockResolvedValue([
      { id: 'cm-1', spkNumber: 'SPK-77', deletedAt: null, equipment: { tagNumber: 'PT-101' } },
    ]);

    const result: any = await service.listAllMovements({ page: 1, limit: 20 } as any);

    expect(result.data[0].movementDate).toBe('2026-10-02');
    expect(result.data[0].reference).toEqual({
      type: 'CORRECTIVE_MAINTENANCE',
      id: 'cm-1',
      label: 'SPK-77',
      deleted: false,
    });
    expect(result.data[1].reference).toBeNull();
    expect(repository.findMaintenanceRefs).toHaveBeenCalledWith(['cm-1']);
  });

  it('label fallback ke tag equipment bila CM tanpa e-SPK, dan menandai CM yang sudah dihapus', async () => {
    const { service, repository } = build();
    repository.findAllMovements.mockResolvedValue({ rows: [row({})], total: 1 });
    repository.findMaintenanceRefs.mockResolvedValue([
      { id: 'cm-1', spkNumber: null, deletedAt: new Date(), equipment: { tagNumber: 'PT-101' } },
    ]);

    const result: any = await service.listAllMovements({ page: 1, limit: 20 } as any);

    expect(result.data[0].reference).toMatchObject({ label: 'PT-101', deleted: true });
  });
});

describe('SparePartsService.getDashboardCharts — tren netto', () => {
  it('Stock Out = netto pengembalian CM dan di-clamp ke 0 bila negatif; Stock In apa adanya', async () => {
    const { service, repository } = build();
    const now = new Date();
    const key = (offset: number) => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    repository.getMonthlyStockInOut.mockResolvedValue([
      { month: key(0), direction: 'IN', total: 12 },
      { month: key(0), direction: 'OUT', total: 7.5 },
      { month: key(1), direction: 'OUT', total: -2 },
    ]);

    const { monthlyTrend }: any = await service.getDashboardCharts(6);

    expect(monthlyTrend.find((m: any) => m.month === key(0))).toMatchObject({ stockIn: 12, stockOut: 7.5 });
    expect(monthlyTrend.find((m: any) => m.month === key(1))).toMatchObject({ stockIn: 0, stockOut: 0 });
  });
});
