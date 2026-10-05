import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import type { StockMovementType } from '@prisma/client';
import type { ManualStockMovementType } from './create-stock-movement.dto';

/** Sumber pengeluaran di halaman Stock Out: manual, otomatis dari Corrective Maintenance, atau semuanya. */
export const STOCK_OUT_SOURCES = ['ALL', 'MANUAL', 'MAINTENANCE'] as const;
export type StockOutSource = (typeof STOCK_OUT_SOURCES)[number];

const MANUAL_STOCK_OUT_TYPES: StockMovementType[] = ['STOCK_OUT'];
const MAINTENANCE_STOCK_OUT_TYPES: StockMovementType[] = ['MAINTENANCE_USAGE', 'MAINTENANCE_RETURN'];

/**
 * Tipe movement yang tampil di halaman Stock Out untuk `source` tertentu. MAINTENANCE_RETURN
 * (pengembalian) ikut ditampilkan agar saldo pemakaian CM bisa dilacak utuh — nilainya positif
 * sehingga tampil sebagai pengurang pengeluaran.
 */
export function resolveStockOutTypes(source: StockOutSource = 'ALL'): StockMovementType[] {
  if (source === 'MANUAL') return MANUAL_STOCK_OUT_TYPES;
  if (source === 'MAINTENANCE') return MAINTENANCE_STOCK_OUT_TYPES;
  return [...MANUAL_STOCK_OUT_TYPES, ...MAINTENANCE_STOCK_OUT_TYPES];
}

/**
 * Query untuk ledger LINTAS spare part (dipakai halaman Stock In / Stock Out) —
 * beda dengan QueryStockMovementDto yang sudah di-scope ke satu sparePartId lewat
 * path param (`GET /spare-parts/:id/stock-movements`).
 *
 * `type` WAJIB diisi oleh controller endpoint Stock In/Stock Out (bukan dari query
 * user) supaya halaman Stock In tidak bisa "bocor" menampilkan baris Stock Out, dst.
 * `search` (dari PaginationQueryDto) dipakai untuk cari KIMAP / nama material.
 */
export class QueryAllStockMovementsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['RESTOCK', 'STOCK_OUT', 'ADJUSTMENT'] })
  @IsOptional()
  @IsIn(['RESTOCK', 'STOCK_OUT', 'ADJUSTMENT'])
  type?: ManualStockMovementType;

  // INTERNAL — diisi controller (tanpa decorator validasi, jadi client yang mengirimnya ditolak
  // oleh forbidNonWhitelisted). Dipakai Stock Out yang mencakup lebih dari satu tipe movement.
  types?: StockMovementType[];

  @ApiPropertyOptional({
    enum: STOCK_OUT_SOURCES,
    description: 'Khusus Stock Out: ALL (default) | MANUAL (input manual) | MAINTENANCE (pemakaian Corrective Maintenance)',
  })
  @IsOptional()
  @IsIn(STOCK_OUT_SOURCES)
  source?: StockOutSource;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Filter tanggal transaksi mulai (inklusif)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Filter tanggal transaksi akhir (inklusif)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
