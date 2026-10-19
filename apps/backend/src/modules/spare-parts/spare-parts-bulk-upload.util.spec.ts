import {
  ExistingSparePart,
  RawSparePartRow,
  keyOf,
  summarize,
  validateRows,
} from './spare-parts-bulk-upload.util';

const existing = (over: Partial<ExistingSparePart> = {}): ExistingSparePart => ({
  id: 'id-1',
  kimap: 'KM-001',
  name: 'Gasket',
  unit: 'pcs',
  minStock: 2,
  status: 'ACTIVE',
  remarks: null,
  deleted: false,
  ...over,
});
const map = (...items: ExistingSparePart[]) => new Map(items.map((i) => [keyOf(i.kimap), i]));
const row = (rowNumber: number, raw: RawSparePartRow) => ({ rowNumber, raw });

describe('validateRows — spare part baru', () => {
  it('baris valid lengkap -> OK/CREATE', () => {
    const [r] = validateRows([row(2, { kimap: 'KM-100', name: 'Seal', unit: 'pcs', stock: '10', minStock: '2', status: 'inactive' })], map(), 'CREATE_ONLY');
    expect(r).toMatchObject({ severity: 'OK', action: 'CREATE' });
    expect(r.resolved).toMatchObject({ stock: 10, minStock: 2, status: 'INACTIVE' });
  });

  it('kolom wajib kosong -> ERROR', () => {
    const [r] = validateRows([row(2, { kimap: 'KM-100' })], map(), 'CREATE_ONLY');
    expect(r.severity).toBe('ERROR');
    expect(r.messages.join(' ')).toMatch(/Nama Material wajib/);
    expect(r.messages.join(' ')).toMatch(/Satuan wajib/);
  });

  it('tanpa KIMAP -> ERROR', () => {
    const [r] = validateRows([row(2, { name: 'X', unit: 'pcs' })], map(), 'CREATE_ONLY');
    expect(r.severity).toBe('ERROR');
    expect(r.messages[0]).toMatch(/KIMAP wajib/);
  });

  it.each([
    ['stock', { stock: '-1' }, /Stok Awal/],
    ['stock desimal >2', { stock: '1.234' }, /2 angka di belakang koma/],
    ['stock teks', { stock: 'abc' }, /angka/],
    ['stock terlalu besar', { stock: '100000000' }, /terlalu besar/],
    ['status salah', { status: 'AKTIF' }, /Status/],
    ['unit kepanjangan', { unit: 'x'.repeat(21) }, /Satuan maksimal 20/],
    ['nama kepanjangan', { name: 'x'.repeat(151) }, /Nama Material maksimal 150/],
  ])('%s -> ERROR', (_l, extra, msg) => {
    const [r] = validateRows([row(2, { kimap: 'K', name: 'N', unit: 'pcs', ...extra })], map(), 'CREATE_ONLY');
    expect(r.severity).toBe('ERROR');
    expect(r.messages.join(' ')).toMatch(msg);
  });

  it('desimal berkoma "1,5" diterima', () => {
    const [r] = validateRows([row(2, { kimap: 'K', name: 'N', unit: 'm', stock: '1,5' })], map(), 'CREATE_ONLY');
    expect(r.resolved?.stock).toBe(1.5);
  });
});

describe('validateRows — KIMAP existing', () => {
  const raw = { kimap: 'km-001', name: 'Gasket', unit: 'pcs' };

  it('CREATE_ONLY: KIMAP existing (case-insensitive) -> ERROR', () => {
    const [r] = validateRows([row(2, raw)], map(existing()), 'CREATE_ONLY');
    expect(r.severity).toBe('ERROR');
    expect(r.messages[0]).toMatch(/sudah terdaftar/);
  });

  it('UPDATE_OR_CREATE: identik -> NO_CHANGE', () => {
    const [r] = validateRows([row(2, raw)], map(existing()), 'UPDATE_OR_CREATE');
    expect(r).toMatchObject({ severity: 'OK', action: 'NO_CHANGE', targetId: 'id-1' });
  });

  it('UPDATE_OR_CREATE: beda nama -> UPDATE', () => {
    const [r] = validateRows([row(2, { ...raw, name: 'Gasket Baru' })], map(existing()), 'UPDATE_OR_CREATE');
    expect(r.action).toBe('UPDATE');
  });

  it('UPDATE_OR_CREATE: kolom kosong tidak dianggap perubahan', () => {
    const [r] = validateRows([row(2, { kimap: 'KM-001' })], map(existing()), 'UPDATE_OR_CREATE');
    expect(r).toMatchObject({ severity: 'OK', action: 'NO_CHANGE' });
  });

  it('UPDATE_OR_CREATE: Stok Awal untuk part existing diabaikan + WARNING (stok tidak berubah lewat upload)', () => {
    const [r] = validateRows([row(2, { ...raw, stock: '50', minStock: '9' })], map(existing()), 'UPDATE_OR_CREATE');
    expect(r.severity).toBe('WARNING');
    expect(r.action).toBe('UPDATE');
    expect(r.messages[0]).toMatch(/Stok Awal diabaikan/);
  });

  it('KIMAP milik part yang sudah dihapus -> ERROR', () => {
    const [r] = validateRows([row(2, raw)], map(existing({ deleted: true })), 'UPDATE_OR_CREATE');
    expect(r.severity).toBe('ERROR');
    expect(r.messages[0]).toMatch(/sudah dihapus/);
  });
});

describe('validateRows — KIMAP kembar di file', () => {
  it('digabung: baris terakhir menang untuk kolom terisi, baris lama dilewati (WARNING/NO_CHANGE)', () => {
    const rows = validateRows(
      [
        row(2, { kimap: 'K1', name: 'Lama', unit: 'pcs', stock: '5' }),
        row(3, { kimap: 'k1', name: 'Baru' }),
      ],
      map(),
      'CREATE_ONLY',
    );
    expect(rows[0]).toMatchObject({ rowNumber: 2, severity: 'WARNING', action: 'NO_CHANGE' });
    expect(rows[1]).toMatchObject({ rowNumber: 3, severity: 'WARNING', action: 'CREATE' });
    expect(rows[1].resolved).toMatchObject({ name: 'Baru', unit: 'pcs', stock: 5 });
    expect(summarize(rows)).toMatchObject({ errorRows: 0, createRows: 1, noChangeRows: 1, canCommit: true });
  });
});

describe('summarize', () => {
  it('canCommit false bila ada error atau tidak ada yang perlu diproses', () => {
    const err = validateRows([row(2, { kimap: 'K' })], map(), 'CREATE_ONLY');
    expect(summarize(err).canCommit).toBe(false);
    const noop = validateRows([row(2, { kimap: 'KM-001' })], map(existing()), 'UPDATE_OR_CREATE');
    expect(summarize(noop)).toMatchObject({ noChangeRows: 1, canCommit: false });
  });
});
