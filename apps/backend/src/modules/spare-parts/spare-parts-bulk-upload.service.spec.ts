import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { SparePartsBulkUploadService } from './spare-parts-bulk-upload.service';
import { SparePartsController } from './spare-parts.controller';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

// Prisma Client di sandbox belum di-generate (enum tidak ada) — stub enum yang dipakai DTO/controller.
// Di CI/Railway (client ter-generate) stub ini setara dengan enum aslinya.
jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
  SparePartStatus: { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' },
  StockMovementType: { RESTOCK: 'RESTOCK', STOCK_OUT: 'STOCK_OUT', ADJUSTMENT: 'ADJUSTMENT', MAINTENANCE_USAGE: 'MAINTENANCE_USAGE', MAINTENANCE_RETURN: 'MAINTENANCE_RETURN' },
  PermissionModule: new Proxy({}, { get: (_t, k) => String(k) }),
}));

async function xlsx(rows: (string | number | undefined)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Spare Part');
  ws.addRow(['KIMAP*', 'Nama Material*', 'Satuan*', 'Stok Awal', 'Min Stock', 'Status', 'Remarks']);
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('SparePartsBulkUploadService', () => {
  const repo = { findAllForBulk: jest.fn(), applyBulk: jest.fn() };
  let service: SparePartsBulkUploadService;

  beforeEach(() => {
    jest.resetAllMocks();
    repo.findAllForBulk.mockResolvedValue([
      { id: 'sp-1', kimap: 'KM-001', name: 'Gasket', unit: 'pcs', minStock: '2', status: 'ACTIVE', remarks: null, deletedAt: null },
    ]);
    service = new SparePartsBulkUploadService(repo as never);
  });

  it('template punya header sesuai urutan kontrak parsing + dropdown status', async () => {
    const buf = await service.generateTemplate();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const ws = wb.getWorksheet('Spare Part')!;
    expect(ws.getRow(1).values).toEqual([undefined, 'KIMAP*', 'Nama Material*', 'Satuan*', 'Stok Awal', 'Min Stock', 'Status', 'Remarks']);
    expect(ws.getCell('F2').dataValidation.formulae[0]).toContain('ACTIVE,INACTIVE');
  });

  it('preview: membaca angka Excel & mengklasifikasi baris; tidak menulis ke DB', async () => {
    const buf = await xlsx([
      ['KM-100', 'Seal', 'pcs', 10, 2, 'ACTIVE', 'ok'],
      ['KM-001', 'Gasket', 'pcs'],
      ['KM-200', undefined, 'pcs'],
      [],
    ]);
    const res = await service.preview(buf, 'f.xlsx', 'CREATE_ONLY');
    expect(res).toMatchObject({ totalRows: 3, okRows: 1, errorRows: 2, createRows: 1, canCommit: false });
    expect(res.rows.map((r) => [r.rowNumber, r.severity])).toEqual([[2, 'OK'], [3, 'ERROR'], [4, 'ERROR']]);
    expect(repo.applyBulk).not.toHaveBeenCalled();
  });

  it('file bukan xlsx / kosong / >1000 baris ditolak', async () => {
    await expect(service.preview(Buffer.from('bukan excel'), 'x', 'CREATE_ONLY')).rejects.toThrow(BadRequestException);
    await expect(service.preview(await xlsx([]), 'x', 'CREATE_ONLY')).rejects.toThrow(/semua baris kosong/);
    const many = Array.from({ length: 1001 }, (_, i) => [`K${i}`, 'N', 'pcs']);
    await expect(service.preview(await xlsx(many), 'x', 'CREATE_ONLY')).rejects.toThrow(/melebihi batas/);
  });

  it('commit: menolak bila ada ERROR (tidak menyimpan apa pun)', async () => {
    const buf = await xlsx([['KM-100', 'Seal', 'pcs'], ['KM-001', 'Gasket', 'pcs']]);
    await expect(service.commit(buf, 'CREATE_ONLY', 'u1')).rejects.toThrow(/ERROR/);
    expect(repo.applyBulk).not.toHaveBeenCalled();
  });

  it('commit UPDATE_OR_CREATE: memisahkan create/update, stok part existing tidak ikut dikirim', async () => {
    repo.applyBulk.mockResolvedValue({ created: 1, updated: 1 });
    const buf = await xlsx([
      ['KM-100', 'Seal', 'pcs', 10, 3],
      ['KM-001', 'Gasket Baru', undefined, 99, 7],
      ['KM-001', undefined, undefined],
    ]);
    const res = await service.commit(buf, 'UPDATE_OR_CREATE', 'u1');
    expect(res).toEqual({ createdCount: 1, updatedCount: 1, skippedCount: 1 });
    const arg = repo.applyBulk.mock.calls[0][0];
    expect(arg.createdById).toBe('u1');
    expect(arg.creates).toEqual([{ kimap: 'KM-100', name: 'Seal', unit: 'pcs', stock: 10, minStock: 3, status: 'ACTIVE', remarks: undefined }]);
    expect(arg.updates).toHaveLength(1);
    expect(arg.updates[0]).toMatchObject({ id: 'sp-1', name: 'Gasket Baru', minStock: 7 });
    expect(arg.updates[0]).not.toHaveProperty('stock');
  });

  it('commit: P2002 (KIMAP direbut proses lain) -> 409', async () => {
    repo.applyBulk.mockRejectedValue({ code: 'P2002' });
    await expect(service.commit(await xlsx([['KM-100', 'Seal', 'pcs']]), 'CREATE_ONLY', 'u1')).rejects.toThrow(ConflictException);
  });
});

describe('SparePartsController — bulk upload hanya Admin', () => {
  it.each(['downloadBulkUploadTemplate', 'previewBulkUpload', 'commitBulkUpload'])('%s dikunci @Roles("Admin")', (handler) => {
    const fn = (SparePartsController.prototype as unknown as Record<string, unknown>)[handler];
    expect(Reflect.getMetadata(ROLES_KEY, fn as object)).toEqual(['Admin']);
  });
});
