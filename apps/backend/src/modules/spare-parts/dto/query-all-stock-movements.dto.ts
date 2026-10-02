import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import type { ManualStockMovementType } from './create-stock-movement.dto';

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

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Filter tanggal mulai (inklusif)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Filter tanggal akhir (inklusif)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
