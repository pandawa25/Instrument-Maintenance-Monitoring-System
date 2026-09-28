import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Criticality, EquipmentStatus } from '@prisma/client';
import { EquipmentRepository } from './equipment.repository';
import { AreasService } from '../areas/areas.service';
import { InstrumentNamesService } from '../instrument-names/instrument-names.service';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';

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

const STATUS_VALUES = Object.values(EquipmentStatus);
const CRITICALITY_VALUES = Object.values(Criticality);

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

@Injectable()
export class EquipmentBulkUploadService {
  constructor(
    private readonly repository: EquipmentRepository,
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
    for (let rowNumber = 2; rowNumber <= 1000; rowNumber += 1) {
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
      this.areasService.findAll({
        page: 1,
        limit: 1000,
        skip: 0,
        sortBy: 'areaCode',
        sortOrder: 'asc',
      } as never),
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

    const areaList = (areas.data ?? []) as { areaCode: string; areaName: string }[];
    const maxRows = Math.max(areaList.length, instrumentNames.length);
    for (let i = 0; i < maxRows; i += 1) {
      refSheet.addRow({
        areaCode: areaList[i]?.areaCode ?? '',
        areaName: areaList[i]?.areaName ?? '',
        inCode: instrumentNames[i]?.code ?? '',
        inName: instrumentNames[i]?.name ?? '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async processUpload(buffer: Buffer): Promise<BulkUploadResultDto> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];

    const result: BulkUploadResultDto = { totalRows: 0, created: 0, updated: 0, failed: 0, errors: [] };
    if (!sheet) {
      result.errors.push({ row: 0, message: 'File Excel tidak memiliki sheet data' });
      return result;
    }

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const excelRow = sheet.getRow(rowNumber);
      const parsed = this.readRow(excelRow);

      if (this.isEmptyRow(parsed)) {
        continue; // lewati baris kosong (mis. sisa baris kosong di bawah data)
      }

      result.totalRows += 1;

      try {
        const outcome = await this.upsertRow(parsed);
        if (outcome === 'created') {
          result.created += 1;
        } else {
          result.updated += 1;
        }
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Baris gagal diproses karena error tidak diketahui',
        });
      }
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
    };
  }

  private isEmptyRow(row: ParsedRow): boolean {
    return Object.values(row).every((value) => value === undefined || value === '');
  }

  private async upsertRow(row: ParsedRow): Promise<'created' | 'updated'> {
    // --- Validasi field wajib ---
    if (!row.areaCode) throw new Error('Kolom "Area Code" wajib diisi');
    if (!row.tagNo) throw new Error('Kolom "Tag No" wajib diisi');
    if (!row.service) throw new Error('Kolom "Service" wajib diisi');
    if (!row.instrumentNameCode) throw new Error('Kolom "Instrument Name Code" wajib diisi');

    // --- Validasi relasi ---
    const area = await this.areasService.findByCode(row.areaCode);
    if (!area) throw new Error(`Area code '${row.areaCode}' tidak ditemukan`);

    const instrumentName = await this.instrumentNamesService.findByCode(row.instrumentNameCode);
    if (!instrumentName) {
      throw new Error(`Instrument name code '${row.instrumentNameCode}' tidak ditemukan`);
    }

    // --- Validasi enum ---
    let status: EquipmentStatus | undefined;
    if (row.status) {
      if (!STATUS_VALUES.includes(row.status as EquipmentStatus)) {
        throw new Error(`Status '${row.status}' tidak valid — pilihan: ${STATUS_VALUES.join(', ')}`);
      }
      status = row.status as EquipmentStatus;
    }

    let criticality: Criticality | undefined;
    if (row.criticality) {
      if (!CRITICALITY_VALUES.includes(row.criticality as Criticality)) {
        throw new Error(`Criticality '${row.criticality}' tidak valid — pilihan: ${CRITICALITY_VALUES.join(', ')}`);
      }
      criticality = row.criticality as Criticality;
    }

    // --- Validasi angka & tanggal ---
    let lrv: number | undefined;
    if (row.lrv !== undefined && row.lrv !== '') {
      lrv = Number(row.lrv);
      if (Number.isNaN(lrv)) throw new Error(`LRV '${row.lrv}' bukan angka yang valid`);
    }

    let urv: number | undefined;
    if (row.urv !== undefined && row.urv !== '') {
      urv = Number(row.urv);
      if (Number.isNaN(urv)) throw new Error(`URV '${row.urv}' bukan angka yang valid`);
    }

    let installationDate: string | undefined;
    if (row.installationDate) {
      const parsedDate = new Date(row.installationDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`Installation Date '${row.installationDate}' bukan format tanggal yang valid`);
      }
      installationDate = parsedDate.toISOString().slice(0, 10);
    }

    const tagNumber = `${area.areaCode}-${row.tagNo}`;

    const payload = {
      tagNumber,
      service: row.service,
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

    const existing = await this.repository.findByTagNumber(tagNumber);
    if (existing) {
      await this.repository.update(existing.id, payload as never);
      return 'updated';
    }

    await this.repository.create(payload as never);
    return 'created';
  }
}
