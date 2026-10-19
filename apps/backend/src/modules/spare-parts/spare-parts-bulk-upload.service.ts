import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { SparePartsRepository } from './spare-parts.repository';
import {
  BULK_COLUMNS,
  BulkMode,
  BulkSummary,
  ExistingSparePart,
  MAX_BULK_ROWS,
  RawSparePartRow,
  RowResult,
  SPARE_PART_STATUS_VALUES,
  keyOf,
  summarize,
  validateRows,
} from './spare-parts-bulk-upload.util';

export interface BulkPreviewResult extends BulkSummary {
  mode: BulkMode;
  filename: string;
  rows: {
    rowNumber: number;
    severity: RowResult['severity'];
    action: RowResult['action'];
    messages: string[];
    raw: RawSparePartRow;
  }[];
}

export interface BulkCommitResult {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
}

/**
 * Bulk Upload Spare Part — STATELESS: preview dan commit sama-sama menerima file dan menjalankan
 * validasi yang sama persis terhadap data DB saat itu. Tidak ada tabel batch; commit tidak
 * mempercayai hasil preview sebelumnya, jadi tidak ada preview basi yang bisa lolos.
 */
@Injectable()
export class SparePartsBulkUploadService {
  private readonly logger = new Logger(SparePartsBulkUploadService.name);

  constructor(private readonly repository: SparePartsRepository) {}

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Spare Part');
    sheet.columns = BULK_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Kolom F = Status. Kolom KIMAP (A) dan Satuan (C) berformat teks supaya kode seperti
    // '000123' tidak dikonversi Excel menjadi angka 123.
    for (let row = 2; row <= MAX_BULK_ROWS + 1; row += 1) {
      sheet.getCell(`F${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${SPARE_PART_STATUS_VALUES.join(',')}"`],
      };
    }
    sheet.getColumn('A').numFmt = '@';
    sheet.getColumn('C').numFmt = '@';

    const guide = workbook.addWorksheet('Petunjuk');
    guide.getColumn(1).width = 110;
    [
      'Kolom bertanda * wajib diisi (untuk spare part baru).',
      `Maksimal ${MAX_BULK_ROWS} baris data per file. Baris 1 (header) jangan diubah/dihapus.`,
      'KIMAP unik (tidak membedakan huruf besar/kecil). KIMAP yang sama di beberapa baris digabung: baris terakhir menang untuk kolom yang terisi.',
      'Stok Awal hanya berlaku untuk spare part BARU dan dicatat di ledger sebagai saldo awal. Stok part yang sudah ada tidak berubah lewat upload — pakai Stock In / Stock Out / Adjustment.',
      'Mode "Tambah & Update": kolom yang dikosongkan tidak mengubah data yang sudah ada.',
      `Status: ${SPARE_PART_STATUS_VALUES.join(' / ')} (kosong = ACTIVE untuk part baru).`,
      'Min Stock = ambang low-stock di Inventory Dashboard (kosong = 0).',
    ].forEach((line) => guide.addRow([line]));

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private cellText(row: ExcelJS.Row, cellNumber: number): string | undefined {
    const value = row.getCell(cellNumber).value as unknown;
    if (value === null || value === undefined) return undefined;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      // Rich text / hyperlink / formula: ambil teks atau hasil hitung.
      if (Array.isArray(obj.richText)) {
        const text = (obj.richText as { text: string }[]).map((r) => r.text).join('').trim();
        return text || undefined;
      }
      const inner = 'text' in obj ? obj.text : 'result' in obj ? obj.result : undefined;
      if (inner === undefined || inner === null) return undefined;
      const text = String(inner).trim();
      return text || undefined;
    }
    const text = String(value).trim();
    return text === '' ? undefined : text;
  }

  private async parse(buffer: Buffer): Promise<{ rowNumber: number; raw: RawSparePartRow }[]> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as never);
    } catch {
      throw new BadRequestException('File bukan format Excel (.xlsx) yang valid');
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('File Excel tidak memiliki sheet data');

    const rows: { rowNumber: number; raw: RawSparePartRow }[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const raw: RawSparePartRow = {};
      BULK_COLUMNS.forEach((col, index) => {
        const text = this.cellText(row, index + 1);
        if (text !== undefined) raw[col.key] = text;
      });
      if (Object.keys(raw).length > 0) rows.push({ rowNumber, raw });
    }

    if (rows.length === 0) {
      throw new BadRequestException('File Excel tidak memiliki baris data (semua baris kosong)');
    }
    if (rows.length > MAX_BULK_ROWS) {
      throw new BadRequestException(
        `File berisi ${rows.length} baris data, melebihi batas maksimal ${MAX_BULK_ROWS} baris per upload. Pecah file menjadi beberapa bagian.`,
      );
    }
    return rows;
  }

  private async validate(buffer: Buffer, mode: BulkMode): Promise<RowResult[]> {
    const rows = await this.parse(buffer);
    const existing = await this.repository.findAllForBulk();
    const existingByKey = new Map<string, ExistingSparePart>(
      existing.map((e: any) => [
        keyOf(e.kimap),
        {
          id: e.id,
          kimap: e.kimap,
          name: e.name,
          unit: e.unit,
          minStock: Number(e.minStock),
          status: e.status,
          remarks: e.remarks,
          deleted: e.deletedAt !== null,
        },
      ]),
    );
    return validateRows(rows, existingByKey, mode);
  }

  async preview(buffer: Buffer, filename: string, mode: BulkMode): Promise<BulkPreviewResult> {
    const results = await this.validate(buffer, mode);
    return {
      mode,
      filename,
      ...summarize(results),
      rows: results.map(({ rowNumber, severity, action, messages, raw }) => ({ rowNumber, severity, action, messages, raw })),
    };
  }

  async commit(buffer: Buffer, mode: BulkMode, userId: string): Promise<BulkCommitResult> {
    const startedAt = Date.now();
    const results = await this.validate(buffer, mode);
    const summary = summarize(results);

    if (summary.errorRows > 0) {
      throw new BadRequestException(
        `File masih punya ${summary.errorRows} baris ERROR — perbaiki lalu upload & preview ulang.`,
      );
    }
    if (!summary.canCommit) {
      throw new BadRequestException('Tidak ada baris yang perlu diproses (semua baris tanpa perubahan)');
    }

    const creates = results
      .filter((r) => r.action === 'CREATE')
      .map((r) => ({
        kimap: r.resolved!.kimap,
        name: r.resolved!.name!,
        unit: r.resolved!.unit!,
        stock: r.resolved!.stock ?? 0,
        minStock: r.resolved!.minStock ?? 0,
        status: r.resolved!.status ?? 'ACTIVE',
        remarks: r.resolved!.remarks,
      }));
    const updates = results
      .filter((r) => r.action === 'UPDATE')
      .map((r) => ({
        id: r.targetId!,
        name: r.resolved!.name,
        unit: r.resolved!.unit,
        minStock: r.resolved!.minStock,
        status: r.resolved!.status,
        remarks: r.resolved!.remarks,
      }));

    try {
      const { created, updated } = await this.repository.applyBulk({ creates, updates, createdById: userId });
      this.logger.log(
        `Bulk upload spare part: create=${created} update=${updated} skip=${summary.noChangeRows} total=${Date.now() - startedAt}ms`,
      );
      return { createdCount: created, updatedCount: updated, skippedCount: summary.noChangeRows };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('KIMAP baru saja dipakai spare part lain — upload & preview ulang file.');
      }
      if (err?.code === 'P2028') {
        throw new ConflictException('Proses commit melebihi batas waktu — coba lagi (tidak ada data yang tersimpan).');
      }
      throw err;
    }
  }
}
