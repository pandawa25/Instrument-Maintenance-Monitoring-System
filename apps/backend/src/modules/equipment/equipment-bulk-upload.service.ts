import { randomUUID, createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Area, Criticality, EquipmentStatus, ImportRowSeverity, InstrumentName, Prisma } from '@prisma/client';
import { normalizeTag } from '@imms/shared-utils';
import { EquipmentRepository } from './equipment.repository';
import { ImportBatchRepository, NewImportRow } from './import-batch.repository';
import { AreasService } from '../areas/areas.service';
import { InstrumentNamesService } from '../instrument-names/instrument-names.service';
import { ImportPreviewResultDto } from './dto/import-preview-result.dto';
import { ImportBatchRowDto } from './dto/import-batch-row.dto';
import { QueryImportRowsDto } from './dto/query-import-rows.dto';
import { ImportCommitResultDto } from './dto/import-commit-result.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

/**
 * Urutan & label kolom template Excel Bulk Upload Equipment.
 * PENTING: urutan ini juga dipakai saat parsing upload — kolom dibaca berdasarkan
 * index (bukan header text), jadi kalau urutan di sini diubah, urutan generate
 * template & baca upload otomatis ikut konsisten.
 */
const TEMPLATE_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'Area Code*', key: 'areaCode', width: 14 },
  { header: 'Tag No*', key: 'tagNo', width: 16 },
  { header: 'Service*', key: 'service', width: 30 },
  { header: 'Instrument Name Code*', key: 'instrumentNameCode', width: 22 },
  { header: 'Type', key: 'type', width: 16 },
  { header: 'Manufacturer', key: 'manufacturer', width: 18 },
  { header: 'Model', key: 'model', width: 16 },
  { header: 'Serial Number', key: 'serialNumber', width: 18 },
  { header: 'Installation Date (YYYY-MM-DD)', key: 'installationDate', width: 24 },
  { header: 'Status', key: 'status', width: 16 },
  { header: 'Criticality', key: 'criticality', width: 14 },
  { header: 'LRV', key: 'lrv', width: 10 },
  { header: 'URV', key: 'urv', width: 10 },
  { header: 'Unit', key: 'unit', width: 10 },
  { header: 'Remarks', key: 'remarks', width: 30 },
];

const STATUS_VALUES: EquipmentStatus[] = Object.values(EquipmentStatus);
const CRITICALITY_VALUES: Criticality[] = Object.values(Criticality);

// Batas keras jumlah baris per upload. File yang lebih besar HARUS dipecah oleh user —
// bukan diam-diam dipotong. Di volume ini, proses sinkron (bukan job queue) masih aman.
const MAX_ROWS = 1000;

// Preview boleh di-commit sampai berapa lama — setelahnya harus preview ulang supaya
// data referensi (area/instrument name/tag lain) yang dipakai tidak basi.
const BATCH_EXPIRY_HOURS = 24;

interface ParsedRow {
  areaCode?: string;
  tagNo?: string;
  service?: string;
  instrumentNameCode?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  status?: string;
  criticality?: string;
  lrv?: string | number;
  urv?: string | number;
  unit?: string;
  remarks?: string;
}

interface ResolvedEquipmentRow {
  tagNumber: string;
  service: string;
  areaId: string;
  instrumentNameId: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  lrv?: number;
  urv?: number;
  unit?: string;
  status?: EquipmentStatus;
  criticality?: Criticality;
  remarks?: string;
}

interface RowValidationContext {
  areasByCode: Map<string, Area>;
  instrumentNamesByCode: Map<string, InstrumentName>;
  activeTagsUpper: Set<string>;
  activeSerialsUpper: Set<string>;
  seenTagsInFile: Map<string, number>;
  seenSerialsInFile: Map<string, number>;
}

interface RowValidationResult {
  severity: ImportRowSeverity;
  messages: string[];
  resolved?: ResolvedEquipmentRow;
}

@Injectable()
export class EquipmentBulkUploadService {
  constructor(
    private readonly repository: EquipmentRepository,
    private readonly importBatchRepository: ImportBatchRepository,
    private readonly areasService: AreasService,
    private readonly instrumentNamesService: InstrumentNamesService,
  ) {}

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Instrument Maintenance Monitoring System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Equipment');
    sheet.columns = TEMPLATE_COLUMNS;

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005BAC' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Baris contoh — memandu format pengisian, dihapus manual oleh user sebelum upload.
    sheet.addRow({
      areaCode: 'PU-01',
      tagNo: 'PT-1001',
      service: 'Pressure Transmitter Suction Pump 01',
      instrumentNameCode: 'PT',
      type: 'Smart',
      manufacturer: 'Yokogawa',
      model: 'EJA110E',
      serialNumber: 'SN-000123',
      installationDate: '2024-01-15',
      status: 'ACTIVE',
      criticality: 'HIGH',
      lrv: 0,
      urv: 100,
      unit: 'barg',
      remarks: 'Contoh baris — hapus sebelum upload',
    });

    // Dropdown validasi untuk kolom Status & Criticality (kolom J & K).
    for (let rowNumber = 2; rowNumber <= MAX_ROWS + 1; rowNumber += 1) {
      sheet.getCell(`J${rowNumber}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${STATUS_VALUES.join(',')}"`],
      };
      sheet.getCell(`K${rowNumber}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${CRITICALITY_VALUES.join(',')}"`],
      };
    }

    // Sheet referensi — daftar Area Code & Instrument Name Code yang valid saat ini,
    // supaya user tidak perlu buka aplikasi lain untuk cek kode yang benar.
    const [areas, instrumentNames] = await Promise.all([
      this.areasService.findAllActive(),
      this.instrumentNamesService.findAllForDropdown(),
    ]);

    const refSheet = workbook.addWorksheet('Referensi');
    refSheet.columns = [
      { header: 'Area Code', key: 'areaCode', width: 16 },
      { header: 'Area Name', key: 'areaName', width: 30 },
      { header: '', key: 'spacer', width: 4 },
      { header: 'Instrument Name Code', key: 'inCode', width: 20 },
      { header: 'Instrument Name', key: 'inName', width: 30 },
    ];
    refSheet.getRow(1).font = { bold: true };

    const areaList = areas as Area[];
    const instrumentNameList = instrumentNames as InstrumentName[];
    const maxRows = Math.max(areaList.length, instrumentNameList.length);
    for (let i = 0; i < maxRows; i += 1) {
      refSheet.addRow({
        areaCode: areaList[i]?.areaCode ?? '',
        areaName: areaList[i]?.areaName ?? '',
        inCode: instrumentNameList[i]?.code ?? '',
        inName: instrumentNameList[i]?.name ?? '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Tahap 1 dari alur bulk upload: parse + validasi SEMUA baris, simpan hasilnya sebagai
   * ImportBatch (status VALIDATED) — TIDAK menyentuh tabel equipment sama sekali. User
   * baru bisa commit (lihat commitBatch) setelah meninjau ringkasan ini.
   */
  async previewUpload(buffer: Buffer, filename: string, userId: string): Promise<ImportPreviewResultDto> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as never);
    } catch {
      throw new BadRequestException('File bukan format Excel (.xlsx) yang valid');
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('File Excel tidak memiliki sheet data');
    }

    const parsedRows: { rowNumber: number; row: ParsedRow }[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const parsed = this.readRow(sheet.getRow(rowNumber));
      if (!this.isEmptyRow(parsed)) {
        parsedRows.push({ rowNumber, row: parsed });
      }
    }

    if (parsedRows.length === 0) {
      throw new BadRequestException('File Excel tidak memiliki baris data (semua baris kosong)');
    }
    if (parsedRows.length > MAX_ROWS) {
      throw new BadRequestException(
        `File berisi ${parsedRows.length} baris data, melebihi batas maksimal ${MAX_ROWS} baris per upload. ` +
          'Pecah file menjadi beberapa bagian lalu upload terpisah.',
      );
    }

    // Preload semua referensi aktif SEKALI di awal (bukan query per baris) — untuk 1000
    // baris ini menghindari ribuan round-trip DB yang bisa bikin request timeout.
    const [areasList, instrumentNamesList, activeTagsUpper, activeSerialsUpper] = await Promise.all([
      this.areasService.findAllActive() as Promise<Area[]>,
      this.instrumentNamesService.findAllForDropdown() as Promise<InstrumentName[]>,
      this.repository.findAllActiveTagNumbersUpper(),
      this.repository.findAllActiveSerialNumbersUpper(),
    ]);

    const ctx: RowValidationContext = {
      areasByCode: new Map(areasList.map((a) => [a.areaCode.toUpperCase(), a])),
      instrumentNamesByCode: new Map(instrumentNamesList.map((i) => [i.code.toUpperCase(), i])),
      activeTagsUpper,
      activeSerialsUpper,
      seenTagsInFile: new Map(),
      seenSerialsInFile: new Map(),
    };

    const rows: NewImportRow[] = parsedRows.map(({ rowNumber, row }) => {
      const result = this.validateRow(rowNumber, row, ctx);
      const payload: Prisma.InputJsonValue = {
        raw: row as unknown as Prisma.InputJsonValue,
        // Cast lewat `unknown` dulu — ResolvedEquipmentRow adalah interface domain biasa
        // tanpa index signature, jadi TS menolak cast langsung ke Prisma.InputJsonValue
        // (union type JSON Prisma mensyaratkan bentuk yang "comparable", termasuk index
        // signature). Data resolved tetap plain object JSON-serializable, aman di-cast.
        resolved: (result.resolved ?? null) as unknown as Prisma.InputJsonValue,
      };
      return { rowNumber, severity: result.severity, messages: result.messages, payload };
    });

    const fileChecksum = createHash('sha256').update(buffer).digest('hex');
    const expiresAt = new Date(Date.now() + BATCH_EXPIRY_HOURS * 60 * 60 * 1000);

    const batch = await this.importBatchRepository.createBatchWithRows({
      entityType: 'EQUIPMENT',
      filename,
      fileChecksum,
      createdById: userId,
      expiresAt,
      rows,
    });

    return {
      batchId: batch.id,
      filename: batch.filename,
      totalRows: batch.totalRows,
      okRows: batch.okRows,
      warningRows: batch.warningRows,
      errorRows: batch.errorRows,
      expiresAt: batch.expiresAt,
      canCommit: batch.errorRows === 0,
    };
  }

  async getBatch(batchId: string) {
    const batch = await this.importBatchRepository.findBatchById(batchId);
    if (!batch) {
      throw new NotFoundException('Import batch tidak ditemukan');
    }
    return {
      batchId: batch.id,
      filename: batch.filename,
      status: batch.status,
      totalRows: batch.totalRows,
      okRows: batch.okRows,
      warningRows: batch.warningRows,
      errorRows: batch.errorRows,
      expiresAt: batch.expiresAt,
      committedAt: batch.committedAt,
      canCommit: batch.status === 'VALIDATED' && batch.errorRows === 0 && batch.expiresAt.getTime() > Date.now(),
    };
  }

  async listRows(batchId: string, query: QueryImportRowsDto): Promise<PaginatedResult<ImportBatchRowDto>> {
    await this.getBatch(batchId); // memastikan batch ada (lempar 404 kalau tidak)

    const { rows, total } = await this.importBatchRepository.findRows(batchId, {
      severity: query.severity,
      skip: query.skip,
      take: query.limit,
    });

    const data: ImportBatchRowDto[] = rows.map((r: { rowNumber: number; severity: ImportRowSeverity; messages: unknown; payload: unknown }) => {
      const payload = r.payload as unknown as { raw: Record<string, unknown> };
      return {
        rowNumber: r.rowNumber,
        severity: r.severity,
        messages: r.messages as unknown as string[],
        raw: payload.raw,
      };
    });

    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /**
   * Tahap 2: insert SEMUA baris OK + WARNING dalam satu transaksi atomic (all-or-nothing).
   * Ditolak kalau batch masih punya baris ERROR, sudah pernah di-commit, atau sudah
   * kedaluwarsa. Constraint DB (partial unique index tag_number) tetap jadi pagar terakhir
   * untuk race condition antara preview dan commit.
   */
  async commitBatch(batchId: string): Promise<ImportCommitResultDto> {
    const batch = await this.importBatchRepository.findBatchById(batchId);
    if (!batch) {
      throw new NotFoundException('Import batch tidak ditemukan');
    }
    if (batch.status === 'COMMITTED') {
      throw new ConflictException('Batch ini sudah pernah di-commit sebelumnya');
    }
    if (batch.status !== 'VALIDATED') {
      throw new BadRequestException(`Batch berstatus '${batch.status}', tidak bisa di-commit`);
    }
    if (batch.expiresAt.getTime() <= Date.now()) {
      await this.importBatchRepository.updateStatus(batchId, 'EXPIRED');
      throw new BadRequestException(
        'Preview batch ini sudah kedaluwarsa (lebih dari 24 jam) — data referensi mungkin sudah berubah. Upload & preview ulang file-nya.',
      );
    }
    if (batch.errorRows > 0) {
      throw new BadRequestException(
        `Batch masih punya ${batch.errorRows} baris berstatus ERROR — perbaiki file lalu upload & preview ulang.`,
      );
    }

    const committableRows = await this.importBatchRepository.findCommittableRows(batchId);
    if (committableRows.length === 0) {
      throw new BadRequestException('Tidak ada baris valid untuk di-commit');
    }

    const equipmentRows: Prisma.EquipmentCreateManyInput[] = committableRows.map((r: { payload: unknown }) => {
      const payload = r.payload as unknown as { resolved: ResolvedEquipmentRow };
      const resolved = payload.resolved;
      return {
        id: randomUUID(),
        tagNumber: resolved.tagNumber,
        service: resolved.service,
        areaId: resolved.areaId,
        instrumentNameId: resolved.instrumentNameId,
        type: resolved.type,
        manufacturer: resolved.manufacturer,
        model: resolved.model,
        serialNumber: resolved.serialNumber,
        installationDate: resolved.installationDate ? new Date(resolved.installationDate) : undefined,
        lrv: resolved.lrv,
        urv: resolved.urv,
        unit: resolved.unit,
        status: resolved.status,
        criticality: resolved.criticality,
        remarks: resolved.remarks,
        importBatchId: batchId,
      };
    });

    try {
      await this.repository.createManyInTransaction(equipmentRows);
    } catch (error) {
      await this.importBatchRepository.updateStatus(batchId, 'FAILED');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Commit gagal — salah satu tag number sudah dipakai equipment lain (kemungkinan dibuat proses lain di antara preview dan commit). Upload & preview ulang file untuk data terbaru.',
        );
      }
      throw error;
    }

    const committed = await this.importBatchRepository.updateStatus(batchId, 'COMMITTED', new Date());

    return {
      batchId: committed.id,
      status: committed.status,
      createdCount: equipmentRows.length,
      committedAt: committed.committedAt as Date,
    };
  }

  private readRow(row: ExcelJS.Row): ParsedRow {
    const cellText = (cellNumber: number): string | undefined => {
      const value = row.getCell(cellNumber).value;
      if (value === null || value === undefined) return undefined;
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }
      if (typeof value === 'object' && value !== null && 'text' in (value as unknown as Record<string, unknown>)) {
        return String((value as unknown as { text: unknown }).text).trim() || undefined;
      }
      const text = String(value).trim();
      return text === '' ? undefined : text;
    };

    return {
      areaCode: cellText(1),
      tagNo: cellText(2),
      service: cellText(3),
      instrumentNameCode: cellText(4),
      type: cellText(5),
      manufacturer: cellText(6),
      model: cellText(7),
      serialNumber: cellText(8),
      installationDate: cellText(9),
      status: cellText(10),
      criticality: cellText(11),
      lrv: cellText(12),
      urv: cellText(13),
      unit: cellText(14),
      remarks: cellText(15),
    };
  }

  private isEmptyRow(row: ParsedRow): boolean {
    return Object.values(row).every((value) => value === undefined || value === '');
  }

  /**
   * Validasi SATU baris. Berhenti di ERROR pertama yang membuat baris ini tidak bisa
   * di-resolve (field wajib kosong, referensi tidak ditemukan, dst) — tidak ada gunanya
   * lanjut validasi field lain kalau area/instrument name-nya sendiri sudah tidak valid.
   * WARNING sebaliknya DIKUMPULKAN (baris tetap valid untuk di-commit).
   *
   * ctx.seenTagsInFile / seenSerialsInFile di-mutate di sini (side effect disengaja) —
   * dipakai untuk mendeteksi duplikat ANTAR baris di file yang sama.
   */
  private validateRow(rowNumber: number, row: ParsedRow, ctx: RowValidationContext): RowValidationResult {
    const missingFields: string[] = [];
    if (!row.areaCode) missingFields.push('Area Code');
    if (!row.tagNo) missingFields.push('Tag No');
    if (!row.service) missingFields.push('Service');
    if (!row.instrumentNameCode) missingFields.push('Instrument Name Code');
    if (missingFields.length > 0) {
      return { severity: 'ERROR', messages: missingFields.map((f) => `Kolom "${f}" wajib diisi`) };
    }

    const area = ctx.areasByCode.get(row.areaCode!.trim().toUpperCase());
    if (!area) {
      return { severity: 'ERROR', messages: [`Area code '${row.areaCode}' tidak ditemukan atau tidak aktif`] };
    }

    const instrumentName = ctx.instrumentNamesByCode.get(row.instrumentNameCode!.trim().toUpperCase());
    if (!instrumentName) {
      return {
        severity: 'ERROR',
        messages: [`Instrument name code '${row.instrumentNameCode}' tidak ditemukan`],
      };
    }

    if (row.service!.length > 150) {
      return { severity: 'ERROR', messages: ['Service melebihi 150 karakter'] };
    }

    // Konvensi tag_number sistem ini: {Area Code}-{Tag No} (sama seperti form manual —
    // frontend otomatis menempelkan prefix area). normalizeTag() trim + rapikan spasi +
    // uppercase, konsisten dengan EquipmentService.create/update.
    const tagNumber = normalizeTag(`${area.areaCode}-${row.tagNo!.trim()}`);
    if (tagNumber.length > 50) {
      return { severity: 'ERROR', messages: [`Tag number '${tagNumber}' melebihi 50 karakter`] };
    }

    const existingAt = ctx.seenTagsInFile.get(tagNumber);
    if (existingAt !== undefined) {
      return { severity: 'ERROR', messages: [`Tag number '${tagNumber}' duplikat dengan baris ${existingAt} di file ini`] };
    }
    if (ctx.activeTagsUpper.has(tagNumber)) {
      return { severity: 'ERROR', messages: [`Tag number '${tagNumber}' sudah dipakai equipment aktif lain`] };
    }
    ctx.seenTagsInFile.set(tagNumber, rowNumber);

    let status: EquipmentStatus | undefined;
    if (row.status) {
      const match = STATUS_VALUES.find((v) => v === row.status!.trim().toUpperCase());
      if (!match) {
        return {
          severity: 'ERROR',
          messages: [`Status '${row.status}' tidak valid — pilihan: ${STATUS_VALUES.join(', ')}`],
        };
      }
      status = match;
    }

    let criticality: Criticality | undefined;
    if (row.criticality) {
      const match = CRITICALITY_VALUES.find((v) => v === row.criticality!.trim().toUpperCase());
      if (!match) {
        return {
          severity: 'ERROR',
          messages: [`Criticality '${row.criticality}' tidak valid — pilihan: ${CRITICALITY_VALUES.join(', ')}`],
        };
      }
      criticality = match;
    }

    const lrvGiven = row.lrv !== undefined && row.lrv !== '';
    const urvGiven = row.urv !== undefined && row.urv !== '';
    if (lrvGiven !== urvGiven) {
      return { severity: 'ERROR', messages: ['LRV dan URV harus diisi berdua atau dikosongkan berdua'] };
    }
    let lrv: number | undefined;
    let urv: number | undefined;
    if (lrvGiven) {
      lrv = Number(row.lrv);
      if (Number.isNaN(lrv)) return { severity: 'ERROR', messages: [`LRV '${row.lrv}' bukan angka yang valid`] };
    }
    if (urvGiven) {
      urv = Number(row.urv);
      if (Number.isNaN(urv)) return { severity: 'ERROR', messages: [`URV '${row.urv}' bukan angka yang valid`] };
    }

    let installationDate: string | undefined;
    const warnings: string[] = [];
    if (row.installationDate) {
      const parsedDate = new Date(row.installationDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return {
          severity: 'ERROR',
          messages: [`Installation Date '${row.installationDate}' bukan format tanggal yang valid`],
        };
      }
      installationDate = parsedDate.toISOString().slice(0, 10);
      if (parsedDate.getTime() > Date.now()) {
        warnings.push(`Installation Date '${installationDate}' ada di masa depan`);
      }
    }

    const lengthChecks: Array<[string, string | undefined, number]> = [
      ['Type', row.type, 100],
      ['Manufacturer', row.manufacturer, 100],
      ['Model', row.model, 100],
      ['Serial Number', row.serialNumber, 100],
      ['Unit', row.unit, 20],
      ['Remarks', row.remarks, 500],
    ];
    for (const [label, value, max] of lengthChecks) {
      if (value && value.length > max) {
        return { severity: 'ERROR', messages: [`${label} melebihi ${max} karakter`] };
      }
    }

    if (lrv !== undefined && urv !== undefined && lrv >= urv) {
      warnings.push(`LRV (${lrv}) >= URV (${urv}) — pastikan bukan salah ketik (bisa valid untuk reverse-acting)`);
    }

    if (row.serialNumber) {
      const serialUpper = row.serialNumber.trim().toUpperCase();
      const firstSerialAt = ctx.seenSerialsInFile.get(serialUpper);
      if (firstSerialAt !== undefined) {
        warnings.push(`Serial Number '${row.serialNumber}' duplikat dengan baris ${firstSerialAt} di file ini`);
      } else {
        ctx.seenSerialsInFile.set(serialUpper, rowNumber);
        if (ctx.activeSerialsUpper.has(serialUpper)) {
          warnings.push(`Serial Number '${row.serialNumber}' sudah dipakai equipment aktif lain`);
        }
      }
    }

    const resolved: ResolvedEquipmentRow = {
      tagNumber,
      service: row.service!.trim(),
      areaId: area.id,
      instrumentNameId: instrumentName.id,
      type: row.type,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serialNumber,
      installationDate,
      lrv,
      urv,
      unit: row.unit,
      status,
      criticality,
      remarks: row.remarks,
    };

    return { severity: warnings.length > 0 ? 'WARNING' : 'OK', messages: warnings, resolved };
  }
}
