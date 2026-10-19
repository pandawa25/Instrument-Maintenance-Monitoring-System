/**
 * Logika murni (tanpa DB/Excel) untuk Bulk Upload Spare Part: definisi kolom template,
 * normalisasi nilai sel, dan validasi per baris. Dipisah dari service supaya mudah di-test.
 */

export const MAX_BULK_ROWS = 1000;

export const SPARE_PART_STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const;
export type BulkSparePartStatus = (typeof SPARE_PART_STATUS_VALUES)[number];

// Batas kolom DB: kimap VarChar(50), name VarChar(150), unit VarChar(20), remarks VarChar(500),
// stock/minStock Decimal(10,2) -> maksimum 99.999.999,99.
const MAX_QUANTITY = 99_999_999.99;

/**
 * Urutan kolom template. Upload dibaca berdasarkan INDEX kolom (bukan teks header), jadi
 * urutan ini = kontrak antara template yang diunduh dan file yang diunggah.
 */
export const BULK_COLUMNS: { header: string; key: keyof RawSparePartRow; width: number }[] = [
  { header: 'KIMAP*', key: 'kimap', width: 18 },
  { header: 'Nama Material*', key: 'name', width: 40 },
  { header: 'Satuan*', key: 'unit', width: 10 },
  { header: 'Stok Awal', key: 'stock', width: 12 },
  { header: 'Min Stock', key: 'minStock', width: 12 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Remarks', key: 'remarks', width: 36 },
];

/** Nilai mentah dari sel Excel (sudah di-trim; kosong = undefined). */
export interface RawSparePartRow {
  kimap?: string;
  name?: string;
  unit?: string;
  stock?: string;
  minStock?: string;
  status?: string;
  remarks?: string;
}

export type BulkMode = 'CREATE_ONLY' | 'UPDATE_OR_CREATE';
export type RowSeverity = 'OK' | 'WARNING' | 'ERROR';
export type RowAction = 'CREATE' | 'UPDATE' | 'NO_CHANGE';

/**
 * Field `undefined` = kolom kosong di Excel. Pada UPDATE artinya "jangan disentuh"
 * (bukan di-set ke null) — konsisten dengan Bulk Upload Equipment.
 */
export interface ResolvedSparePartRow {
  kimap: string;
  name?: string;
  unit?: string;
  stock?: number;
  minStock?: number;
  status?: BulkSparePartStatus;
  remarks?: string;
}

export interface ExistingSparePart {
  id: string;
  kimap: string;
  name: string;
  unit: string;
  minStock: number;
  status: string;
  remarks: string | null;
  deleted: boolean;
}

export interface RowResult {
  rowNumber: number;
  severity: RowSeverity;
  action: RowAction;
  messages: string[];
  raw: RawSparePartRow;
  resolved: ResolvedSparePartRow | null;
  targetId?: string;
}

export const keyOf = (kimap: string): string => kimap.trim().toUpperCase();

/** '1,5' atau '1.5' atau 3 -> number; null kalau bukan angka valid. */
function parseQuantity(text: string): number | null {
  const normalized = /^\d+,\d+$/.test(text) ? text.replace(',', '.') : text;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function checkQuantity(label: string, text: string | undefined, errors: string[]): number | undefined {
  if (text === undefined) return undefined;
  const value = parseQuantity(text);
  if (value === null) {
    errors.push(`${label} harus berupa angka tidak negatif (nilai: '${text}')`);
    return undefined;
  }
  if (Math.round(value * 100) / 100 !== value) {
    errors.push(`${label} maksimal 2 angka di belakang koma (nilai: '${text}')`);
    return undefined;
  }
  if (value > MAX_QUANTITY) {
    errors.push(`${label} terlalu besar (maks ${MAX_QUANTITY})`);
    return undefined;
  }
  return value;
}

function checkMaxLength(label: string, value: string | undefined, max: number, errors: string[]) {
  if (value !== undefined && value.length > max) {
    errors.push(`${label} maksimal ${max} karakter (saat ini ${value.length})`);
  }
}

/** Validasi + resolve nilai satu baris, tanpa melihat data existing. */
export function resolveRow(raw: RawSparePartRow): { resolved: ResolvedSparePartRow | null; errors: string[] } {
  const errors: string[] = [];

  if (!raw.kimap) errors.push('KIMAP wajib diisi');
  checkMaxLength('KIMAP', raw.kimap, 50, errors);
  checkMaxLength('Nama Material', raw.name, 150, errors);
  checkMaxLength('Satuan', raw.unit, 20, errors);
  checkMaxLength('Remarks', raw.remarks, 500, errors);

  const stock = checkQuantity('Stok Awal', raw.stock, errors);
  const minStock = checkQuantity('Min Stock', raw.minStock, errors);

  let status: BulkSparePartStatus | undefined;
  if (raw.status !== undefined) {
    const upper = raw.status.toUpperCase();
    if ((SPARE_PART_STATUS_VALUES as readonly string[]).includes(upper)) {
      status = upper as BulkSparePartStatus;
    } else {
      errors.push(`Status '${raw.status}' tidak valid — pilihan: ${SPARE_PART_STATUS_VALUES.join(', ')}`);
    }
  }

  if (errors.length > 0 || !raw.kimap) return { resolved: null, errors };

  return {
    resolved: {
      kimap: raw.kimap,
      name: raw.name,
      unit: raw.unit,
      stock,
      minStock,
      status,
      remarks: raw.remarks,
    },
    errors,
  };
}

/** Gabungkan baris bertag kembar: baris terakhir menang untuk kolom terisi, kolom kosong tidak menimpa. */
function consolidate(rows: { rowNumber: number; raw: RawSparePartRow }[]) {
  const groups = new Map<string, { rowNumber: number; raw: RawSparePartRow }[]>();
  const order: string[] = [];
  const lone: { rowNumber: number; raw: RawSparePartRow }[] = [];
  for (const row of rows) {
    if (!row.raw.kimap) {
      lone.push(row);
      continue;
    }
    const k = keyOf(row.raw.kimap);
    if (!groups.has(k)) {
      groups.set(k, []);
      order.push(k);
    }
    groups.get(k)!.push(row);
  }

  const out: {
    rowNumber: number;
    raw: RawSparePartRow;
    supersededBy?: number;
    mergedFromRows: number[];
  }[] = [];

  for (const k of order) {
    const members = groups.get(k)!;
    if (members.length === 1) {
      out.push({ ...members[0], mergedFromRows: [] });
      continue;
    }
    const last = members[members.length - 1];
    const merged: RawSparePartRow = {};
    for (const m of members) {
      for (const key of Object.keys(m.raw) as (keyof RawSparePartRow)[]) {
        if (m.raw[key] !== undefined) merged[key] = m.raw[key];
      }
    }
    for (const m of members.slice(0, -1)) {
      out.push({ rowNumber: m.rowNumber, raw: m.raw, supersededBy: last.rowNumber, mergedFromRows: [] });
    }
    out.push({
      rowNumber: last.rowNumber,
      raw: merged,
      mergedFromRows: members.slice(0, -1).map((m) => m.rowNumber),
    });
  }
  for (const row of lone) out.push({ ...row, mergedFromRows: [] });
  return out.sort((a, b) => a.rowNumber - b.rowNumber);
}

/** Validasi seluruh baris file terhadap data existing. Urutan hasil = urutan nomor baris. */
export function validateRows(
  rows: { rowNumber: number; raw: RawSparePartRow }[],
  existingByKey: Map<string, ExistingSparePart>,
  mode: BulkMode,
): RowResult[] {
  return consolidate(rows).map(({ rowNumber, raw, supersededBy, mergedFromRows }): RowResult => {
    if (supersededBy !== undefined) {
      return {
        rowNumber,
        severity: 'WARNING',
        action: 'NO_CHANGE',
        messages: [`KIMAP duplikat di file ini — baris dilewati karena digabung ke baris ${supersededBy} (nilai baris terakhir dipakai)`],
        raw,
        resolved: null,
      };
    }

    const { resolved, errors } = resolveRow(raw);
    const messages = [...errors];
    if (!resolved) {
      return { rowNumber, severity: 'ERROR', action: 'CREATE', messages, raw, resolved: null };
    }

    const warnings: string[] = [];
    if (mergedFromRows.length > 0) {
      warnings.push(
        `KIMAP muncul di baris ${[...mergedFromRows, rowNumber].join(', ')} — digabung jadi satu (baris terakhir menang untuk kolom yang terisi)`,
      );
    }

    const existing = existingByKey.get(keyOf(resolved.kimap));

    if (existing?.deleted) {
      messages.push(`KIMAP '${resolved.kimap}' dipakai spare part yang sudah dihapus — tidak bisa dipakai ulang, hubungi Admin sistem`);
      return { rowNumber, severity: 'ERROR', action: 'CREATE', messages, raw, resolved };
    }

    if (!existing) {
      if (!resolved.name) messages.push('Nama Material wajib diisi untuk spare part baru');
      if (!resolved.unit) messages.push('Satuan wajib diisi untuk spare part baru');
      if (messages.length > 0) {
        return { rowNumber, severity: 'ERROR', action: 'CREATE', messages, raw, resolved };
      }
      return {
        rowNumber,
        severity: warnings.length > 0 ? 'WARNING' : 'OK',
        action: 'CREATE',
        messages: warnings,
        raw,
        resolved,
      };
    }

    // KIMAP sudah ada (aktif)
    if (mode === 'CREATE_ONLY') {
      messages.push(`KIMAP '${resolved.kimap}' sudah terdaftar — gunakan mode "Tambah & Update" untuk mengubahnya`);
      return { rowNumber, severity: 'ERROR', action: 'CREATE', messages, raw, resolved };
    }

    if (resolved.stock !== undefined) {
      warnings.push('Stok Awal diabaikan untuk spare part yang sudah ada — ubah stok lewat Stock In / Stock Out / Adjustment agar tercatat di ledger');
    }

    const changed =
      (resolved.name !== undefined && resolved.name !== existing.name) ||
      (resolved.unit !== undefined && resolved.unit !== existing.unit) ||
      (resolved.minStock !== undefined && resolved.minStock !== existing.minStock) ||
      (resolved.status !== undefined && resolved.status !== existing.status) ||
      (resolved.remarks !== undefined && resolved.remarks !== (existing.remarks ?? undefined));

    return {
      rowNumber,
      severity: warnings.length > 0 ? 'WARNING' : 'OK',
      action: changed ? 'UPDATE' : 'NO_CHANGE',
      messages: warnings,
      raw,
      resolved,
      targetId: existing.id,
    };
  });
}

export interface BulkSummary {
  totalRows: number;
  okRows: number;
  warningRows: number;
  errorRows: number;
  createRows: number;
  updateRows: number;
  noChangeRows: number;
  canCommit: boolean;
}

export function summarize(results: RowResult[]): BulkSummary {
  const count = (fn: (r: RowResult) => boolean) => results.filter(fn).length;
  const errorRows = count((r) => r.severity === 'ERROR');
  const createRows = count((r) => r.severity !== 'ERROR' && r.action === 'CREATE');
  const updateRows = count((r) => r.severity !== 'ERROR' && r.action === 'UPDATE');
  return {
    totalRows: results.length,
    okRows: count((r) => r.severity === 'OK'),
    warningRows: count((r) => r.severity === 'WARNING'),
    errorRows,
    createRows,
    updateRows,
    noChangeRows: count((r) => r.severity !== 'ERROR' && r.action === 'NO_CHANGE'),
    canCommit: errorRows === 0 && createRows + updateRows > 0,
  };
}
