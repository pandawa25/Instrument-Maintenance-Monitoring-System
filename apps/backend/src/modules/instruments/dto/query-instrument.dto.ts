import { ApiPropertyOptional } from '@nestjs/swagger';
import { InstrumentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Filter khusus module Instrument: area, type, status — sesuai spec MVP.
export class QueryInstrumentDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter berdasarkan UUID Area' })
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan UUID Instrument Type' })
  @IsOptional()
  @IsUUID()
  instrumentTypeId?: string;

  @ApiPropertyOptional({ enum: InstrumentStatus })
  @IsOptional()
  @IsEnum(InstrumentStatus)
  status?: InstrumentStatus;
}
