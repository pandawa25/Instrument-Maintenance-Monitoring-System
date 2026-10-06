import { randomUUID, createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  Area,
  Criticality,
  Equipment,
  EquipmentStatus,
  FailAction,
  ImportMode,
  ImportRowAction,
  ImportRowSeverity,
  InstrumentName,
  Prisma,
} from '@prisma/client';
import { normalizeTag } from '@imms/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
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
  // Khusus equipment valve (Instrument Name Code CV/SV/KV/UV) — lihat EquipmentBulkUploadService
  // dan revisi "Module Equipment valve fields". Sengaja ditambahkan DI AKHIR (bukan disisipkan
  // di tengah) supaya kolom Status (J) & Criticality (K) yang dipakai dataValidation di bawah
  // tidak ikut bergeser huruf kolomnya.
  { header: 'Size', key: 'size', width: 12 },
  { header: 'Rating', key: 'rating', width: 14 },
  { header: 'Fail Action', key: 'failAction', width: 16 },
];

const STATUS_VALUES: EquipmentStatus[] = Object.values(EquipmentStatus);
const CRITICALITY_VALUES: Criticality[] = Object.values(Criticality);
const FAIL_ACTION_VALUES: FailAction[] = Object.values(FailAction);

// Batas keras jumlah baris per upload. File yang lebih besar HARUS dipecah oleh user —
// bukan diam-diam dipotong. Di volume ini, proses sinkron (bukan job queue) masih aman.
const MAX_ROWS = 1000;

// Preview boleh di-commit sampai berapa lama — setelahnya harus preview ulang supaya
// data referensi (area/instrument name/tag lain) yang dipakai tidak basi.
const BATCH_EXPIRY_HOURS = 24;

// Transaksi commit: 1000 baris UPDATE = ~1000 statement berurutan ke DB (Railway punya latensi
// jaringan per query), jadi default Prisma 5 detik & 30 detik tidak cukup (P2028).
const COMMIT_TX_OPTIONS = { timeout: 120_000, maxWait: 10_000 };

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
  size?: string;
  rating?: string;
  failAction?: string;
}

/**
 * Field yang `undefined` berarti "kolom kosong di Excel" — PENTING untuk mode UPDATE_OR_CREATE:
 * kosong = tidak mengubah nilai existing (bukan di-set ke null). Lihat buildPartialUpdateData()
 * & hasFieldChanges(). Untuk mode CREATE_ONLY, undefined berarti field itu memang tidak diisi
 * (equipment baru dibuat dengan nilai null/default Prisma untuk field tersebut).
 */
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
  size?: string;
  rating?: string;
  failAction?: FailAction;
  status?: EquipmentStatus;
  criticality?: Criticality;
  remarks?: string;
}

interface RowValidationContext {
  mode: ImportMode;
  areasByCode: Map<string, Area>;
  instrumentNamesByCode: Map<string, InstrumentName>;
  activeTagsUpper: Set<string>;
  activeEquipmentByTagUpper?: Map<string, Equipment>; // hanya terisi untuk mode UPDATE_OR_CREATE
  activeSerialsUpper: Set<string>;
  seenTagsInFile: Map<string, number>;
  seenSerialsInFile: Map<string, number>;
}

interface RowValidationResult {
  severity: ImportRowSeverity;
  messages: string[];
  resolved?: ResolvedEquipmentRow;
  action?: ImportRowAction;
  targetEquipmentId?: string;
}

@Injectable()
export class EquipmentBulkUploadService {
  constructor(
    private readonly prisma: PrismaService,
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

    // Contoh baris kedua — equipment valve (Size/Rating/Fail Action, bukan LRV/URV/Unit).
    sheet.addRow({
      areaCode: 'PU-01',
      tagNo: 'CV-1001',
      service: 'Control Valve Discharge Pump 01',
      instrumentNameCode: 'CV',
      manufacturer: 'Fisher',
      model: 'ED',
      serialNumber: 'SN-000456',
      installationDate: '2024-01-15',
      status: 'ACTIVE',
      criticality: 'HIGH',
      size: '2"',
      rating: 'ANSI 600',
      failAction: 'CLOSE',
      remarks: 'Contoh baris valve — hapus sebelum upload',
    });

    // Dropdown validasi untuk kolom Status (J), Criticality (K), & Fail Action (R).
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
      sheet.getCell(`R${rowNumber}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${FAIL_ACTION_VALUES.join(',')}"`],
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
   *
   * mode CREATE_ONLY (default): tag yang sudah ada equipment aktif = ERROR (perilaku lama).
   * mode UPDATE_OR_CREATE: tag yang sudah ada equipment aktif dibandingkan datanya — beda =
   * action UPDATE, identik = action NO_CHANGE (dilewati saat commit, bukan error).
   */
  async previewUpload(
    buffer: Buffer,
    filename: string,
    userId: string,
    mode: ImportMode = 'CREATE_ONLY',
  ): Promise<ImportPreviewResultDto> {
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
    // baris ini menghindari ribuan round-trip DB yang bisa bikin request timeout. Untuk mode
    // UPDATE_OR_CREATE, fetch FULL ROW equipment (bukan cuma Set tag) karena perlu diff data.
    const [areasList, instrumentNamesList, activeSerialsUpper] = await Promise.all([
      this.areasService.findAllActive() as Promise<Area[]>,
      this.instrumentNamesService.findAllForDropdown() as Promise<InstrumentName[]>,
      this.repository.findAllActiveSerialNumbersUpper(),
    ]);

    let activeTagsUpper: Set<string>;
    let activeEquipmentByTagUpper: Map<string, Equipment> | undefined;
    if (mode === 'UPDATE_OR_CREATE') {
      activeEquipmentByTagUpper = await this.repository.findAllActiveEquipmentByTagUpper();
      activeTagsUpper = new Set(activeEquipmentByTagUpper.keys());
    } else {
      activeTagsUpper = await this.repository.findAllActiveTagNumbersUpper();
    }

    const ctx: RowValidationContext = {
      mode,
      areasByCode: new Map(areasList.map((a) => [a.areaCode.toUpperCase(), a])),
      instrumentNamesByCode: new Map(instrumentNamesList.map((i) => [i.code.toUpperCase(), i])),
      activeTagsUpper,
      activeEquipmentByTagUpper,
      activeSerialsUpper,
      seenTagsInFile: new Map(),
      seenSerialsInFile: new Map(),
    };

    // Tag kembar dalam satu file TIDAK lagi jadi ERROR (yang dulu memblokir seluruh commit) —
    // digabung jadi satu baris efektif: baris terakhir menang untuk kolom yang terisi, kolom
    // kosong tidak menimpa. Baris yang digantikan ditandai WARNING + NO_CHANGE (dilewati).
    const consolidated = this.consolidateDuplicateTags(parsedRows, ctx.areasByCode);

    const rows: NewImportRow[] = consolidated.map(({ rowNumber, row, raw, supersededBy, mergedFromRows }) => {
      if (supersededBy !== undefined) {
        return {
          rowNumber,
          severity: 'WARNING' as ImportRowSeverity,
          messages: [
            `Tag number duplikat di file ini — baris ini dilewati karena digabung ke baris ${supersededBy} (nilai baris terakhir yang dipakai)`,
          ],
          payload: { raw: raw as unknown as Prisma.InputJsonValue, resolved: null },
          action: 'NO_CHANGE' as ImportRowAction,
          targetEquipmentId: undefined,
        };
      }

      const result = this.validateRow(rowNumber, row, ctx);
      if (mergedFromRows.length > 0 && result.severity !== 'ERROR') {
        result.messages.unshift(
          `Tag number muncul di baris ${[...mergedFromRows, rowNumber].join(', ')} — digabung jadi satu (baris terakhir menang untuk kolom yang terisi)`,
        );
        result.severity = 'WARNING';
      }
      const payload: Prisma.InputJsonValue = {
        raw: raw as unknown as Prisma.InputJsonValue,
        // Cast lewat `unknown` dulu — ResolvedEquipmentRow adalah interface domain biasa
        // tanpa index signature, jadi TS menolak cast langsung ke Prisma.InputJsonValue
        // (union type JSON Prisma mensyaratkan bentuk yang "comparable", termasuk index
        // signature). Data resolved tetap plain object JSON-serializable, aman di-cast.
        resolved: (result.resolved ?? null) as unknown as Prisma.InputJsonValue,
      };
      return {
        rowNumber,
        severity: result.severity,
        messages: result.messages,
        payload,
        action: result.action,
        targetEquipmentId: result.targetEquipmentId,
      };
    });

    const fileChecksum = createHash('sha256').update(buffer).digest('hex');
    const expiresAt = new Date(Date.now() + BATCH_EXPIRY_HOURS * 60 * 60 * 1000);

    const batch = await this.importBatchRepository.createBatchWithRows({
      entityType: 'EQUIPMENT',
      mode,
      filename,
      fileChecksum,
      createdById: userId,
      expiresAt,
      rows,
    });

    const actionCounts = await this.importBatchRepository.countActionsForCommittableRows(batch.id);

    return {
      batchId: batch.id,
      mode: batch.mode,
      filename: batch.filename,
      totalRows: batch.totalRows,
      okRows: batch.okRows,
      warningRows: batch.warningRows,
      errorRows: batch.errorRows,
      expiresAt: batch.expiresAt,
      canCommit: batch.errorRows === 0,
      ...actionCounts,
    };
  }

  async getBatch(batchId: string) {
    const batch = await this.importBatchRepository.findBatchById(batchId);
    if (!batch) {
      throw new NotFoundException('Import batch tidak ditemukan');
    }
    const actionCounts = await this.importBatchRepository.countActionsForCommittableRows(batchId);
    return {
      batchId: batch.id,
      mode: batch.mode,
      filename: batch.filename,
      status: batch.status,
      totalRows: batch.totalRows,
      okRows: batch.okRows,
      warningRows: batch.warningRows,
      errorRows: batch.errorRows,
      expiresAt: batch.expiresAt,
      committedAt: batch.committedAt,
      canCommit: batch.status === 'VALIDATED' && batch.errorRows === 0 && batch.expiresAt.getTime() > Date.now(),
      ...actionCounts,
    };
  }

  async listRows(batchId: string, query: QueryImportRowsDto): Promise<PaginatedResult<ImportBatchRowDto>> {
    await this.getBatch(batchId); // memastikan batch ada (lempar 404 kalau tidak)

    const { rows, total } = await this.importBatchRepository.findRows(batchId, {
      severity: query.severity,
      skip: query.skip,
      take: query.limit,
    });

    const data: ImportBatchRowDto[] = rows.map(
      (r: { rowNumber: number; severity: ImportRowSeverity; action: ImportRowAction | null; messages: unknown; payload: unknown }) => {
        const payload = r.payload as unknown as { raw: Record<string, unknown> };
        return {
          rowNumber: r.rowNumber,
          severity: r.severity,
          action: r.action,
          messages: r.messages as unknown as string[],
          raw: payload.raw,
        };
      },
    );

    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /**
   * Tahap 2: insert/update SEMUA baris OK + WARNING (kecuali action NO_CHANGE, yang dilewati)
   * dalam satu transaksi atomic (all-or-nothing). Ditolak kalau batch masih punya baris ERROR,
   * sudah pernah di-commit, atau sudah kedaluwarsa. Constraint DB (partial unique index
   * tag_number) tetap jadi pagar terakhir untuk race condition antara preview dan commit.
   *
   * Untuk baris action=UPDATE: nilai equipment SEBELUM diubah disnapshot ke
   * EquipmentChangeSnapshot (dikelompokkan dalam satu EquipmentBulkOperation source=IMPORT_UPSERT)
   * supaya bisa di-rollback nanti (lihat EquipmentRevertService). Baris action=CREATE tidak perlu
   * snapshot — revert-nya cukup soft-delete equipment yang baru dibuat.
   */
  async commitBatch(batchId: string, userId: string): Promise<ImportCommitResultDto> {
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
    const rowsToApply = committableRows.filter((r: { action: ImportRowAction | null }) => r.action !== 'NO_CHANGE');
    if (rowsToApply.length === 0) {
      throw new BadRequestException('Tidak ada baris yang perlu diproses (semua baris NO_CHANGE atau kosong)');
    }

    const createRows = rowsToApply.filter((r: { action: ImportRowAction | null }) => r.action !== 'UPDATE');
    const updateRows = rowsToApply.filter((r: { action: ImportRowAction | null }) => r.action === 'UPDATE');

    const equipmentCreateInputs: Prisma.EquipmentCreateManyInput[] = createRows.map((r: { payload: unknown }) => {
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
        size: resolved.size,
        rating: resolved.rating,
        failAction: resolved.failAction,
        status: resolved.status,
        criticality: resolved.criticality,
        remarks: resolved.remarks,
        importBatchId: batchId,
      };
    });

    let operationId: string | undefined;

    try {
      await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          for (let i = 0; i < equipmentCreateInputs.length; i += 500) {
            await tx.equipment.createMany({ data: equipmentCreateInputs.slice(i, i + 500) });
          }

          if (updateRows.length > 0) {
            const snapshots: { id: string; equipmentId: string; beforeData: Prisma.InputJsonValue }[] = [];

            // Ambil SEMUA equipment target dalam 1 query (bukan findUnique per baris).
            const targetIds = (updateRows as { targetEquipmentId: string | null }[])
              .map((r) => r.targetEquipmentId)
              .filter((id): id is string => !!id);
            const existingList: Equipment[] = await tx.equipment.findMany({ where: { id: { in: targetIds } } });
            const existingById = new Map<string, Equipment>(existingList.map((e) => [e.id, e]));

            for (const r of updateRows as { payload: unknown; targetEquipmentId: string | null }[]) {
              const payload = r.payload as unknown as { resolved: ResolvedEquipmentRow };
              const resolved = payload.resolved;
              const equipmentId = r.targetEquipmentId;
              if (!equipmentId) {
                throw new ConflictException(
                  `Baris update untuk tag '${resolved.tagNumber}' kehilangan referensi target — upload & preview ulang file.`,
                );
              }

              const existing = existingById.get(equipmentId);
              if (!existing || existing.deletedAt) {
                throw new ConflictException(
                  `Equipment target update untuk tag '${resolved.tagNumber}' sudah tidak ada/terhapus sejak preview — upload & preview ulang file.`,
                );
              }

              // Serialize via JSON supaya Decimal/Date otomatis jadi string plain JSON-safe
              // (Decimal & Date sama-sama punya toJSON()) — aman disimpan ke kolom Json & aman
              // dibaca ulang saat revert (lihat EquipmentRevertService).
              snapshots.push({
                id: randomUUID(),
                equipmentId,
                beforeData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
              });

              await tx.equipment.update({
                where: { id: equipmentId },
                data: this.buildPartialUpdateData(resolved),
              });
            }

            operationId = randomUUID();
            await tx.equipmentBulkOperation.create({
              data: {
                id: operationId,
                source: 'IMPORT_UPSERT',
                importBatchId: batchId,
                affectedCount: updateRows.length,
                createdById: userId,
              },
            });
            await tx.equipmentChangeSnapshot.createMany({
              data: snapshots.map((s) => ({ ...s, operationId: operationId as string })),
            });
          }

          await tx.importBatch.update({
            where: { id: batchId },
            data: { status: 'COMMITTED', committedAt: new Date() },
          });
        },
        COMMIT_TX_OPTIONS,
      );
    } catch (error) {
      // Timeout transaksi (P2028) bersifat sementara & seluruh transaksi sudah rollback — batch
      // dibiarkan VALIDATED supaya bisa di-commit ulang tanpa upload & preview ulang.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2028') {
        throw new ServiceUnavailableException(
          'Commit melebihi batas waktu transaksi database dan sudah dibatalkan (tidak ada data yang berubah). Batch masih valid — klik Commit lagi. Kalau terus berulang, pecah file menjadi beberapa bagian.',
        );
      }
      await this.importBatchRepository.updateStatus(batchId, 'FAILED');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Commit gagal — salah satu tag number sudah dipakai equipment lain (kemungkinan dibuat proses lain di antara preview dan commit). Upload & preview ulang file untuk data terbaru.',
        );
      }
      throw error;
    }

    const committed = await this.importBatchRepository.findBatchById(batchId);

    return {
      batchId: batchId,
      status: committed!.status,
      createdCount: equipmentCreateInputs.length,
      updatedCount: updateRows.length,
      operationId,
      committedAt: committed!.committedAt as Date,
    };
  }

  /**
   * Bangun payload Prisma.EquipmentUpdateInput HANYA dari field yang terisi di Excel
   * (resolved[field] !== undefined). Field yang kosong di Excel TIDAK disentuh sama sekali —
   * ini yang membuat mode UPDATE_OR_CREATE aman dipakai untuk update parsial (mis. hanya mau
   * update Status & Criticality tanpa harus mengisi ulang semua kolom lain).
   */
  private buildPartialUpdateData(resolved: ResolvedEquipmentRow): Prisma.EquipmentUncheckedUpdateInput {
    // Pakai FK scalar (unchecked) — nested `connect` memicu query tambahan per baris.
    // areaId/instrumentNameId sudah divalidasi di preview.
    const data: Prisma.EquipmentUncheckedUpdateInput = {
      areaId: resolved.areaId,
      instrumentNameId: resolved.instrumentNameId,
      service: resolved.service,
    };
    if (resolved.type !== undefined) data.type = resolved.type ?? null;
    if (resolved.manufacturer !== undefined) data.manufacturer = resolved.manufacturer ?? null;
    if (resolved.model !== undefined) data.model = resolved.model ?? null;
    if (resolved.serialNumber !== undefined) data.serialNumber = resolved.serialNumber ?? null;
    if (resolved.installationDate !== undefined) {
      data.installationDate = resolved.installationDate ? new Date(resolved.installationDate) : null;
    }
    if (resolved.lrv !== undefined) data.lrv = resolved.lrv ?? null;
    if (resolved.urv !== undefined) data.urv = resolved.urv ?? null;
    if (resolved.unit !== undefined) data.unit = resolved.unit ?? null;
    if (resolved.size !== undefined) data.size = resolved.size ?? null;
    if (resolved.rating !== undefined) data.rating = resolved.rating ?? null;
    if (resolved.failAction !== undefined) data.failAction = resolved.failAction ?? null;
    if (resolved.status !== undefined) data.status = resolved.status;
    if (resolved.criticality !== undefined) data.criticality = resolved.criticality;
    if (resolved.remarks !== undefined) data.remarks = resolved.remarks ?? null;
    return data;
  }

  /**
   * Bandingkan nilai existing equipment vs resolved (hasil parsing baris Excel) — HANYA untuk
   * field yang terisi di Excel (resolved[field] !== undefined, konsisten dengan semantik
   * buildPartialUpdateData di atas: kolom kosong = tidak ikut dibandingkan/diubah).
   * true kalau ada minimal satu field yang nilainya beda (action harus UPDATE).
   */
  private hasFieldChanges(existing: Equipment, resolved: ResolvedEquipmentRow): boolean {
    const checks: Array<[unknown, unknown]> = [
      [existing.areaId, resolved.areaId],
      [existing.instrumentNameId, resolved.instrumentNameId],
      [existing.service, resolved.service],
    ];

    if (resolved.type !== undefined) checks.push([existing.type ?? null, resolved.type ?? null]);
    if (resolved.manufacturer !== undefined) checks.push([existing.manufacturer ?? null, resolved.manufacturer ?? null]);
    if (resolved.model !== undefined) checks.push([existing.model ?? null, resolved.model ?? null]);
    if (resolved.serialNumber !== undefined) checks.push([existing.serialNumber ?? null, resolved.serialNumber ?? null]);
    if (resolved.installationDate !== undefined) {
      const existingDate = existing.installationDate ? existing.installationDate.toISOString().slice(0, 10) : null;
      checks.push([existingDate, resolved.installationDate ?? null]);
    }
    if (resolved.lrv !== undefined) {
      checks.push([existing.lrv !== null ? Number(existing.lrv) : null, resolved.lrv ?? null]);
    }
    if (resolved.urv !== undefined) {
      checks.push([existing.urv !== null ? Number(existing.urv) : null, resolved.urv ?? null]);
    }
    if (resolved.unit !== undefined) checks.push([existing.unit ?? null, resolved.unit ?? null]);
    if (resolved.size !== undefined) checks.push([existing.size ?? null, resolved.size ?? null]);
    if (resolved.rating !== undefined) checks.push([existing.rating ?? null, resolved.rating ?? null]);
    if (resolved.failAction !== undefined) checks.push([existing.failAction ?? null, resolved.failAction ?? null]);
    if (resolved.status !== undefined) checks.push([existing.status, resolved.status]);
    if (resolved.criticality !== undefined) checks.push([existing.criticality, resolved.criticality]);
    if (resolved.remarks !== undefined) checks.push([existing.remarks ?? null, resolved.remarks ?? null]);

    return checks.some(([a, b]) => a !== b);
  }

  /**
   * Gabungkan baris-baris dengan tag number (Area Code + Tag No, case-insensitive) yang sama.
   * Baris terakhir menjadi baris efektif; field-nya = gabungan semua baris (nilai yang lebih
   * belakang menimpa, kolom kosong tidak menimpa). Baris sebelumnya ditandai `supersededBy`.
   * Baris yang tag/area-nya belum bisa dihitung (kosong/area tidak dikenal) tidak digabung —
   * biarkan validateRow melaporkan error aslinya.
   */
  private consolidateDuplicateTags(
    parsedRows: { rowNumber: number; row: ParsedRow }[],
    areasByCode: Map<string, Area>,
  ): { rowNumber: number; row: ParsedRow; raw: ParsedRow; supersededBy?: number; mergedFromRows: number[] }[] {
    const keyOf = (row: ParsedRow): string | undefined => {
      if (!row.areaCode || !row.tagNo) return undefined;
      const area = areasByCode.get(row.areaCode.trim().toUpperCase());
      if (!area) return undefined;
      return normalizeTag(`${area.areaCode}-${row.tagNo.trim()}`);
    };

    const groups = new Map<string, number[]>(); // key -> index di parsedRows
    parsedRows.forEach(({ row }, idx) => {
      const key = keyOf(row);
      if (!key) return;
      const list = groups.get(key);
      if (list) list.push(idx);
      else groups.set(key, [idx]);
    });

    const result = parsedRows.map(({ rowNumber, row }) => ({
      rowNumber,
      row,
      raw: row,
      supersededBy: undefined as number | undefined,
      mergedFromRows: [] as number[],
    }));

    for (const indexes of groups.values()) {
      if (indexes.length < 2) continue;
      const lastIdx = indexes[indexes.length - 1];
      const merged: ParsedRow = {};
      for (const idx of indexes) {
        for (const [k, v] of Object.entries(parsedRows[idx].row) as [keyof ParsedRow, unknown][]) {
          if (v !== undefined && v !== '') (merged as Record<string, unknown>)[k] = v;
        }
      }
      for (const idx of indexes.slice(0, -1)) {
        result[idx].supersededBy = parsedRows[lastIdx].rowNumber;
        result[lastIdx].mergedFromRows.push(parsedRows[idx].rowNumber);
      }
      result[lastIdx].row = merged;
    }
    return result;
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
      size: cellText(16),
      rating: cellText(17),
      failAction: cellText(18),
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

    const tagAlreadyActive = ctx.activeTagsUpper.has(tagNumber);
    if (tagAlreadyActive && ctx.mode !== 'UPDATE_OR_CREATE') {
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
      ['Size', row.size, 50],
      ['Rating', row.rating, 50],
    ];
    for (const [label, value, max] of lengthChecks) {
      if (value && value.length > max) {
        return { severity: 'ERROR', messages: [`${label} melebihi ${max} karakter`] };
      }
    }

    let failAction: FailAction | undefined;
    if (row.failAction) {
      const match = FAIL_ACTION_VALUES.find((v) => v === row.failAction!.trim().toUpperCase());
      if (!match) {
        return {
          severity: 'ERROR',
          messages: [`Fail Action '${row.failAction}' tidak valid — pilihan: ${FAIL_ACTION_VALUES.join(', ')}`],
        };
      }
      failAction = match;
    }

    if (lrv !== undefined && urv !== undefined && lrv >= urv) {
      warnings.push(`LRV (${lrv}) >= URV (${urv}) — pastikan bukan salah ketik (bisa valid untuk reverse-acting)`);
    }

    // Cek duplikat serial number HANYA terhadap tag lain (bukan terhadap dirinya sendiri saat
    // mode upsert nanti meng-update baris yang kebetulan serial number-nya tidak berubah) —
    // perbandingan "milik siapa serial ini sekarang" dilakukan di bawah lewat targetEquipmentId.
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
      size: row.size,
      rating: row.rating,
      failAction,
      status,
      criticality,
      remarks: row.remarks,
    };

    let action: ImportRowAction = 'CREATE';
    let targetEquipmentId: string | undefined;
    if (tagAlreadyActive) {
      const existing = ctx.activeEquipmentByTagUpper!.get(tagNumber)!;
      targetEquipmentId = existing.id;
      action = this.hasFieldChanges(existing, resolved) ? 'UPDATE' : 'NO_CHANGE';
      if (action === 'UPDATE') {
        warnings.push(`Tag '${tagNumber}' sudah ada — baris ini akan meng-UPDATE equipment existing`);
      } else {
        warnings.push(`Tag '${tagNumber}' sudah ada & datanya identik — baris ini dilewati (tidak ada perubahan)`);
      }
    }

    return { severity: warnings.length > 0 ? 'WARNING' : 'OK', messages: warnings, resolved, action, targetEquipmentId };
  }
}
