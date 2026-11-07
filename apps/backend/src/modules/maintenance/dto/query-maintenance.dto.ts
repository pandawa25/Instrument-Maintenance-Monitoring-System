import { ApiPropertyOptional } from '@nestjs/swagger';
import { Criticality, MaintenanceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const DATE_FIELD_OPTIONS = ['maintenanceDate', 'completionDate'] as const;
export type MaintenanceDateField = (typeof DATE_FIELD_OPTIONS)[number];

// Filter khusus module Corrective Maintenance sesuai spec MVP: date range, area, instrument, status.
export class QueryMaintenanceDto extends PaginationQueryDto {
  // Default sort untuk list maintenance: tanggal maintenance terbaru dulu (bukan createdAt).
  sortBy: string = 'maintenanceDate';

  @ApiPropertyOptional({ description: 'Filter tanggal mulai (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter tanggal akhir (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: DATE_FIELD_OPTIONS,
    default: 'maintenanceDate',
    description: 'Kolom tanggal yang dipakai untuk dateFrom/dateTo: tanggal mulai atau tanggal selesai',
  })
  @IsOptional()
  @IsIn(DATE_FIELD_OPTIONS)
  dateField?: MaintenanceDateField;

  @ApiPropertyOptional({ description: 'Filter berdasarkan UUID Area' })
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan UUID Equipment' })
  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ enum: Criticality, description: 'Filter berdasarkan priority' })
  @IsOptional()
  @IsEnum(Criticality)
  priority?: Criticality;
}
