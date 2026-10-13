import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export const HISTORY_TYPE_FILTERS = ['ALL', 'CORRECTIVE', 'PREVENTIVE'] as const;
export type HistoryTypeFilter = (typeof HISTORY_TYPE_FILTERS)[number];

export class QueryEquipmentHistoryDto {
  @ApiPropertyOptional({ description: 'Tanggal kegiatan mulai (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Tanggal kegiatan akhir (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: HISTORY_TYPE_FILTERS, default: 'ALL' })
  @IsOptional()
  @IsIn(HISTORY_TYPE_FILTERS)
  type: HistoryTypeFilter = 'ALL';
}
