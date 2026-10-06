import * as ExcelJS from 'exceljs';

// Prisma client tidak selalu ter-generate di lingkungan test — enum yang dipakai service
// cukup disediakan sebagai konstanta.
jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  EquipmentStatus: { ACTIVE: 'ACTIVE', STANDBY: 'STANDBY', OUT_OF_SERVICE: 'OUT_OF_SERVICE' },
  Criticality: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' },
  FailAction: { OPEN: 'OPEN', CLOSE: 'CLOSE', LAST: 'LAST' },
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));

import { EquipmentBulkUploadService } from './equipment-bulk-upload.service';

const HEADERS = [
  'Area Code*', 'Tag No*', 'Service*', 'Instrument Name Code*', 'Type', 'Manufacturer', 'Model',
  'Serial Number', 'Installation Date', 'Status', 'Criticality', 'LRV', 'URV', 'Unit', 'Remarks',
  'Size', 'Rating', 'Fail Action',
];

async function buildXlsx(rows: (string | number | undefined)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Equipment');
  sheet.addRow(HEADERS);
  rows.forEach((r) => sheet.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function build(existing: Map<string, any> = new Map()) {
  const createBatchWithRows = jest.fn().mockImplementation(async (p: any) => ({
    id: 'batch-1',
    mode: p.mode,
    filename: p.filename,
    totalRows: p.rows.length,
    okRows: p.rows.filter((r: any) => r.severity === 'OK').length,
    warningRows: p.rows.filter((r: any) => r.severity === 'WARNING').length,
    errorRows: p.rows.filter((r: any) => r.severity === 'ERROR').length,
    expiresAt: new Date(Date.now() + 1000),
  }));
  const service = new EquipmentBulkUploadService(
    {} as any,
    {
      findAllActiveSerialNumbersUpper: jest.fn().mockResolvedValue(new Set()),
      findAllActiveEquipmentByTagUpper: jest.fn().mockResolvedValue(existing),
      findAllActiveTagNumbersUpper: jest.fn().mockResolvedValue(new Set(existing.keys())),
    } as any,
    {
      createBatchWithRows,
      countActionsForCommittableRows: jest.fn().mockResolvedValue({ createRows: 0, updateRows: 0, noChangeRows: 0 }),
    } as any,
    { findAllActive: jest.fn().mockResolvedValue([{ id: 'a1', areaCode: 'PU-01' }]) } as any,
    { findAllForDropdown: jest.fn().mockResolvedValue([{ id: 'n1', code: 'PT' }]) } as any,
  );
  return { service, createBatchWithRows };
}

describe('EquipmentBulkUploadService.previewUpload — tag number kembar dalam file', () => {
  it.each(['CREATE_ONLY', 'UPDATE_OR_CREATE'] as const)('mode %s: duplikat tidak jadi ERROR, canCommit true', async (mode) => {
    const { service, createBatchWithRows } = build();
    const buf = await buildXlsx([
      ['PU-01', 'PT-1001', 'Service lama', 'PT', undefined, 'Yokogawa'],
      ['PU-01', 'pt-1001', 'Service baru', 'PT', undefined, undefined, 'EJA110E'],
    ]);

    const result = await service.previewUpload(buf, 'f.xlsx', 'u1', mode);

    expect(result.errorRows).toBe(0);
    expect(result.canCommit).toBe(true);
    const rows = createBatchWithRows.mock.calls[0][0].rows;
    expect(rows[0]).toMatchObject({ rowNumber: 2, severity: 'WARNING', action: 'NO_CHANGE' });
    expect(rows[1]).toMatchObject({ rowNumber: 3, severity: 'WARNING' });
  });

  it('baris terakhir menang, kolom kosong tidak menimpa nilai baris sebelumnya', async () => {
    const { service, createBatchWithRows } = build();
    const buf = await buildXlsx([
      ['PU-01', 'PT-1001', 'Service lama', 'PT', undefined, 'Yokogawa'],
      ['PU-01', 'PT-1001', 'Service baru', 'PT', undefined, undefined, 'EJA110E'],
    ]);

    await service.previewUpload(buf, 'f.xlsx', 'u1', 'CREATE_ONLY');

    const effective = createBatchWithRows.mock.calls[0][0].rows[1];
    expect(effective.payload.resolved).toMatchObject({
      tagNumber: 'PU-01-PT-1001',
      service: 'Service baru',
      manufacturer: 'Yokogawa',
      model: 'EJA110E',
    });
    expect(effective.messages[0]).toContain('baris 2, 3');
  });

  it('tag berbeda tidak digabung', async () => {
    const { service, createBatchWithRows } = build();
    const buf = await buildXlsx([
      ['PU-01', 'PT-1001', 'A', 'PT'],
      ['PU-01', 'PT-1002', 'B', 'PT'],
    ]);

    const result = await service.previewUpload(buf, 'f.xlsx', 'u1', 'CREATE_ONLY');

    expect(result.warningRows).toBe(0);
    expect(createBatchWithRows.mock.calls[0][0].rows.every((r: any) => r.action === 'CREATE')).toBe(true);
  });

  it('error pada baris efektif (mis. area salah di baris lain) tetap dilaporkan, bukan ditelan', async () => {
    const { service } = build();
    const buf = await buildXlsx([
      ['PU-01', 'PT-1001', 'A', 'PT'],
      ['PU-01', 'PT-1001', 'B', 'XX'], // instrument name code tidak valid
    ]);

    const result = await service.previewUpload(buf, 'f.xlsx', 'u1', 'CREATE_ONLY');

    expect(result.errorRows).toBe(1);
    expect(result.canCommit).toBe(false);
  });
});
