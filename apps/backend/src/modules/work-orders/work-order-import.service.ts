import { randomUUID, createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportMode, ImportRowSeverity, Prisma } from '@prisma/client';
import { normalizeErpEquipmentTag } from '@imms/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportBatchRepository, NewImportRow } from '../equipment/import-batch.repository';
import { EquipmentService } from '../equipment/equipment.service';
import { SAP_COLUMN_HEADERS, deriveLifecycleStage } from './work-order-matching.util';
import {
  NOTIFICATION_UPSERT_SQL,
  WORK_ORDER_UPSERT_SQL,
  NotificationUpsertInput,
  WorkOrderUpsertInput,
  buildNotificationUpsertParams,
  buildWorkOrderUpsertParams,
} from './work-order-bulk-sql';
import { WoImportPreviewResultDto } from './dto/wo-import-preview-result.dto';
import { WoImportCommitResultDto } from './dto/wo-import-commit-result.dto';
import { WoLastImportInfoDto } from './dto/wo-last-import-info.dto';
import { WoImportBatchRowDto } from './dto/wo-import-batch-row.dto';
import { QueryImportRowsDto } from './dto/query-import-rows.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/pagination-query.dto';

// Batas sama dengan Bulk Upload Equipment — file lebih besar harus dipecah user.
const MAX_ROWS = 1000;
const BATCH_EXPIRY_HOURS = 24;
// Commit memakai 2 batch SQL (Notification lalu WorkOrder), masing-masing di-chunk 500 baris
// per statement lewat `INSERT ... FROM jsonb_to_recordset($1) ... ON CONFLICT DO UPDATE`
// (lihat work-order-bulk-sql.ts) — BUKAN loop create/update per baris. Pola ini sudah
// terbukti di Bulk Upload Equipment (lihat roadmap.md Risk #21: 997 baris turun dari timeout
// jadi ≈45ms). Timeout tetap digenerosi sebagai jaring pengaman, bukan jalur utama.
const COMMIT_TX_OPTIONS = { timeout: 120_000, maxWait: 10_000 };

interface ParsedWoRow {
  notificationNo?: string;
  orderNo?: string;
  description?: string;
  functionalLocation?: string;
  equipmentRaw?: string;
  plant?: string;
  orderType?: string;
  maintActivType?: string;
  userStatus?: string;
  systemStatus?: string;
  basicStartDate?: Date;
  basicFinDate?: Date;
  createdOn?: Date;
}

function cellText(value: ExcelJS.CellValue): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object') {
    const obj = value as any;
    // Rich text / hyperlink cell shapes — kolom teks biasa di export SAP PM ini seharusnya
    // plain string, tapi dijaga untuk kasus file yang sempat dibuka/disimpan ulang di Excel.
    if (Array.isArray(obj.richText)) return obj.richText.map((p: { text: string }) => p.text).join('').trim() || undefined;
    if (typeof obj.text === 'string') return obj.text.trim() || undefined;
    if (obj.result !== undefined) return cellText(obj.result);
  }
  const str = String(value).trim();
  return str || undefined;
}

function cellDate(value: ExcelJS.CellValue): Date | undefined {
  if (value instanceof Date) return value;
  const text = cellText(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

@Injectable()
export class WorkOrderImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importBatchRepository: ImportBatchRepository,
    private readonly equipmentService: EquipmentService,
  ) {}

  private async parseWorkbook(buffer: Buffer): Promise<ParsedWoRow[]> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as never);
    } catch {
      throw new BadRequestException('File tidak bisa dibaca — pastikan formatnya .xlsx');
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('File Excel tidak punya sheet apa pun');
    }

    const headerRow = sheet.getRow(1);
    const colIndex = new Map<string, number>();
    // Beberapa judul kolom MUNCUL DUA KALI di export SAP PM asli — paling penting "Description"
    // (kolom ke-10: deskripsi Order, selalu terisi; kolom ke-32: deskripsi item material/PR,
    // selalu kosong di sample yang dianalisis — lihat docs/design-notification-work-order.md §2).
    // Ambil KEMUNCULAN PERTAMA (bukan terakhir) supaya tidak salah ambil kolom yang kosong itu.
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell.value);
      if (text && !colIndex.has(text)) colIndex.set(text, colNumber);
    });

    const required = [SAP_COLUMN_HEADERS.order, SAP_COLUMN_HEADERS.notification, SAP_COLUMN_HEADERS.description];
    const missing = required.filter((h) => !colIndex.has(h));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Format file tidak dikenali — kolom ${missing.map((m) => `"${m}"`).join(', ')} tidak ditemukan di baris header. ` +
          'Pastikan file adalah export SAP PM asli (mis. "WO 01012026.xlsx"), bukan hasil edit manual yang mengubah nama kolom.',
      );
    }

    const get = (row: ExcelJS.Row, header: string): ExcelJS.CellValue | undefined => {
      const idx = colIndex.get(header);
      return idx ? row.getCell(idx).value : undefined;
    };

    const rows: ParsedWoRow[] = [];
    const totalRows = sheet.rowCount;
    for (let r = 2; r <= totalRows; r++) {
      const row = sheet.getRow(r);
      if (!row.hasValues) continue;

      rows.push({
        notificationNo: cellText(get(row, SAP_COLUMN_HEADERS.notification)),
        orderNo: cellText(get(row, SAP_COLUMN_HEADERS.order)),
        description: cellText(get(row, SAP_COLUMN_HEADERS.description)),
        functionalLocation: cellText(get(row, SAP_COLUMN_HEADERS.functionalLocation)),
        equipmentRaw: cellText(get(row, SAP_COLUMN_HEADERS.equipment)),
        plant: cellText(get(row, SAP_COLUMN_HEADERS.plant)),
        orderType: cellText(get(row, SAP_COLUMN_HEADERS.orderType)),
        maintActivType: cellText(get(row, SAP_COLUMN_HEADERS.maintActivType)),
        userStatus: cellText(get(row, SAP_COLUMN_HEADERS.userStatus)),
        systemStatus: cellText(get(row, SAP_COLUMN_HEADERS.systemStatus)),
        basicStartDate: cellDate(get(row, SAP_COLUMN_HEADERS.basicStartDate)),
        basicFinDate: cellDate(get(row, SAP_COLUMN_HEADERS.basicFinDate)),
        createdOn: cellDate(get(row, SAP_COLUMN_HEADERS.createdOn)),
      });
    }

    if (rows.length > MAX_ROWS) {
      throw new BadRequestException(`File berisi ${rows.length} baris, melebihi batas ${MAX_ROWS} baris per upload — pecah file jadi beberapa bagian`);
    }
    if (rows.length === 0) {
      throw new BadRequestException('File tidak berisi baris data (hanya header, atau semua baris kosong)');
    }

    return rows;
  }

  private validateRow(row: ParsedWoRow, tagMap: Map<string, { id: string }>): { severity: ImportRowSeverity; messages: string[]; equipmentId?: string } {
    const messages: string[] = [];

    if (!row.orderNo) {
      return { severity: 'ERROR', messages: ['Kolom "Order" kosong — baris tidak bisa diimport'] };
    }
    if (!row.description) {
      return { severity: 'ERROR', messages: ['Kolom "Description" kosong — baris tidak bisa diimport'] };
    }

    let severity: ImportRowSeverity = 'OK';
    let equipmentId: string | undefined;

    if (!row.notificationNo) {
      severity = 'WARNING';
      messages.push('Kolom "Notification" kosong — Work Order diimport tanpa link Notification');
    }

    if (row.equipmentRaw) {
      const matched = tagMap.get(normalizeErpEquipmentTag(row.equipmentRaw));
      if (matched) {
        equipmentId = matched.id;
      } else {
        severity = 'WARNING';
        messages.push(`Tag equipment "${row.equipmentRaw}" tidak ditemukan di Master Equipment — masuk Antrian Belum Terhubung`);
      }
    } else {
      severity = 'WARNING';
      messages.push('Kolom "Equipment" kosong di file sumber — masuk Antrian Belum Terhubung');
    }

    const { recognized } = deriveLifecycleStage(row.systemStatus);
    if (!recognized) {
      severity = 'WARNING';
      messages.push(`Token pertama System Status ("${row.systemStatus ?? '-'}") tidak dikenali — tahap stepper di-default ke "Dibuat"`);
    }

    return { severity, messages, equipmentId };
  }

  async previewUpload(buffer: Buffer, filename: string, userId: string): Promise<WoImportPreviewResultDto> {
    const parsedRows = await this.parseWorkbook(buffer);
    const tagMap = await this.equipmentService.findAllActiveEquipmentByTagUpper();

    const newRows: NewImportRow[] = parsedRows.map((row, idx) => {
      const { severity, messages, equipmentId } = this.validateRow(row, tagMap);
      const { stage } = deriveLifecycleStage(row.systemStatus);
      // Json field (ImportBatchRow.payload) tidak menerima Date mentah — simpan sebagai string
      // ISO (YYYY-MM-DD), sama pola dengan `resolved.installationDate` di EquipmentBulkUploadService.
      // Diparse balik ke Date saat commitBatch().
      const payload = {
        ...row,
        basicStartDate: row.basicStartDate ? row.basicStartDate.toISOString().slice(0, 10) : undefined,
        basicFinDate: row.basicFinDate ? row.basicFinDate.toISOString().slice(0, 10) : undefined,
        createdOn: row.createdOn ? row.createdOn.toISOString().slice(0, 10) : undefined,
        equipmentId,
        lifecycleStage: stage,
      } as Prisma.InputJsonValue;
      return { rowNumber: idx + 2, payload, severity, messages };
    });

    const checksum = createHash('sha256').update(buffer).digest('hex');
    const expiresAt = new Date(Date.now() + BATCH_EXPIRY_HOURS * 60 * 60 * 1000);

    const batch = await this.importBatchRepository.createBatchWithRows({
      entityType: 'WORK_ORDER',
      mode: ImportMode.UPDATE_OR_CREATE,
      filename,
      fileChecksum: checksum,
      createdById: userId,
      expiresAt,
      rows: newRows,
    });

    return this.toPreviewResult(batch);
  }

  private toPreviewResult(batch: { id: string; filename: string; totalRows: number; okRows: number; warningRows: number; errorRows: number; expiresAt: Date }): WoImportPreviewResultDto {
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

  async getBatch(batchId: string): Promise<WoImportPreviewResultDto> {
    const batch = await this.importBatchRepository.findBatchById(batchId);
    if (!batch || batch.entityType !== 'WORK_ORDER') {
      throw new NotFoundException('Batch import Work Order tidak ditemukan');
    }
    return this.toPreviewResult(batch);
  }

  /** Info "Data terakhir diupdate ..." di atas list — null kalau belum pernah ada import yang commit. */
  async getLastImportInfo(): Promise<WoLastImportInfoDto> {
    const batch = await this.importBatchRepository.findLatestCommitted('WORK_ORDER');
    return {
      committedAt: batch?.committedAt ?? null,
      filename: batch?.filename ?? null,
      totalRows: batch?.totalRows ?? null,
      okRows: batch?.okRows ?? null,
      warningRows: batch?.warningRows ?? null,
      errorRows: batch?.errorRows ?? null,
    };
  }

  async listRows(batchId: string, query: QueryImportRowsDto): Promise<PaginatedResult<WoImportBatchRowDto>> {
    const batch = await this.importBatchRepository.findBatchById(batchId);
    if (!batch || batch.entityType !== 'WORK_ORDER') {
      throw new NotFoundException('Batch import Work Order tidak ditemukan');
    }
    const { rows, total } = await this.importBatchRepository.findRows(batchId, { severity: query.severity, skip: query.skip, take: query.limit });
    const data = rows.map(
      (r: { rowNumber: number; severity: ImportRowSeverity; messages: unknown; payload: unknown }): WoImportBatchRowDto => ({
        rowNumber: r.rowNumber,
        severity: r.severity,
        messages: r.messages as string[],
        raw: r.payload as Record<string, unknown>,
      }),
    );
    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async commitBatch(batchId: string, userId: string): Promise<WoImportCommitResultDto> {
    const batch = await this.importBatchRepository.findBatchById(batchId);
    if (!batch || batch.entityType !== 'WORK_ORDER') {
      throw new NotFoundException('Batch import Work Order tidak ditemukan');
    }
    if (batch.status === 'COMMITTED') {
      throw new ConflictException('Batch ini sudah pernah di-commit sebelumnya');
    }
    if (batch.status === 'EXPIRED' || batch.expiresAt < new Date()) {
      throw new ConflictException('Batch sudah kedaluwarsa — lakukan preview ulang');
    }
    if (batch.errorRows > 0) {
      throw new BadRequestException('Masih ada baris ERROR — perbaiki file lalu preview ulang sebelum commit');
    }

    const rows = await this.importBatchRepository.findCommittableRows(batchId);

    // Baris yang punya Notification (sebagian kecil tidak, lihat validateRow()) — dipisah
    // supaya upsert Notification & WorkOrder jadi 2 batch SQL terpisah (bukan N query per baris,
    // lihat work-order-bulk-sql.ts). notification_no dijadikan KEY uppercase untuk resolve
    // notification_id per baris WorkOrder setelah batch Notification selesai.
    // Di JSON payload, basicStartDate/basicFinDate/createdOn tersimpan sebagai string ISO
    // (YYYY-MM-DD) — lihat catatan di previewUpload(). Tidak perlu diparse ke Date di sini,
    // langsung dikirim sebagai string ke jsonb_to_recordset (kolom ::date di SQL yang cast).
    type StoredWoRowPayload = Omit<ParsedWoRow, 'basicStartDate' | 'basicFinDate' | 'createdOn'> & {
      basicStartDate?: string;
      basicFinDate?: string;
      createdOn?: string;
      equipmentId?: string;
      lifecycleStage: string;
    };
    const parsedRows = (rows as { payload: any }[]).map((row) => ({
      id: randomUUID(),
      data: row.payload as StoredWoRowPayload,
    }));

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        // 1) Upsert semua Notification (hanya baris yang punya notificationNo), ambil id
        //    hasilnya langsung dari RETURNING — tidak perlu SELECT tambahan.
        const notifInputs: NotificationUpsertInput[] = parsedRows
          .filter((r) => r.data.notificationNo)
          .map((r) => ({
            id: randomUUID(),
            notificationNo: r.data.notificationNo!,
            equipmentId: r.data.equipmentId,
            equipmentTagRaw: r.data.equipmentRaw,
            functionalLocation: r.data.functionalLocation,
            plant: r.data.plant,
            createdOnErp: r.data.createdOn,
            importBatchId: batchId,
          }));

        const notificationIdByKey = new Map<string, string>();
        for (const json of buildNotificationUpsertParams(notifInputs)) {
          const returned = (await tx.$queryRawUnsafe(NOTIFICATION_UPSERT_SQL, json)) as {
            id: string;
            notification_no: string;
          }[];
          for (const r of returned) notificationIdByKey.set(r.notification_no.toUpperCase(), r.id);
        }

        // 2) Upsert semua WorkOrder, notification_id di-resolve dari map di atas.
        const woInputs: WorkOrderUpsertInput[] = parsedRows.map((r) => ({
          id: r.id,
          orderNo: r.data.orderNo!,
          notificationId: r.data.notificationNo
            ? notificationIdByKey.get(r.data.notificationNo.toUpperCase())
            : undefined,
          equipmentId: r.data.equipmentId,
          equipmentTagRaw: r.data.equipmentRaw,
          orderType: r.data.orderType,
          maintActivType: r.data.maintActivType,
          description: r.data.description!,
          functionalLocation: r.data.functionalLocation,
          plant: r.data.plant,
          basicStartDate: r.data.basicStartDate,
          basicFinDate: r.data.basicFinDate,
          userStatus: r.data.userStatus,
          systemStatus: r.data.systemStatus,
          lifecycleStage: r.data.lifecycleStage,
          importBatchId: batchId,
        }));

        let workOrderCount = 0;
        let unmatchedCount = 0;
        for (const json of buildWorkOrderUpsertParams(woInputs)) {
          const returned = (await tx.$queryRawUnsafe(WORK_ORDER_UPSERT_SQL, json)) as { id: string; unmatched: boolean }[];
          workOrderCount += returned.length;
          unmatchedCount += returned.filter((r) => r.unmatched).length;
        }

        await tx.importBatch.update({ where: { id: batchId }, data: { status: 'COMMITTED', committedAt: new Date() } });

        return { notificationCount: notificationIdByKey.size, workOrderCount, unmatchedCount };
      }, COMMIT_TX_OPTIONS);

      return {
        batchId,
        status: 'COMMITTED',
        notificationCount: result.notificationCount,
        workOrderCount: result.workOrderCount,
        unmatchedCount: result.unmatchedCount,
        committedAt: new Date(),
      };
    } catch (err) {
      await this.importBatchRepository.updateStatus(batchId, 'FAILED');
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2028') {
        throw new ServiceUnavailableException('Commit timeout — coba lagi dalam beberapa saat');
      }
      throw err;
    }
  }
}
