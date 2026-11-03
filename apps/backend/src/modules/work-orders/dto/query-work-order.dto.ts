import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderLifecycleStage } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Filter khusus modul Work Order & Notifikasi. `search` (dari PaginationQueryDto) mencari di
// Notification No./Order No./Deskripsi — lihat WorkOrdersRepository.buildWhere().
export class QueryWorkOrderDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter UUID Equipment' })
  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @ApiPropertyOptional({ description: 'Filter UUID Area (lewat equipment.areaId)' })
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiPropertyOptional({ description: 'Filter Order Type persis (mis. PT02, PT03)' })
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiPropertyOptional({
    enum: WorkOrderLifecycleStage,
    description: 'Filter tahap siklus (dipicu klik node stepper di UI)',
  })
  @IsOptional()
  @IsEnum(WorkOrderLifecycleStage)
  lifecycleStage?: WorkOrderLifecycleStage;

  @ApiPropertyOptional({ description: 'Filter Basic Start Date >= tanggal ini (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter Basic Start Date <= tanggal ini (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'true = hanya baris yang equipmentId-nya belum ter-link ("Antrian Belum Terhubung")',
  })
  @IsOptional()
  // Query string selalu string ("true"/"false") — Boolean("false") === true di JS, jadi
  // transform manual di sini, bukan @Type(() => Boolean) bawaan class-transformer.
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unmatchedOnly?: boolean;
}
