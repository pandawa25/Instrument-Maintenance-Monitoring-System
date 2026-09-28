import { ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Filter khusus module Equipment: area, instrument name, status — sesuai spec MVP.
export class QueryEquipmentDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter berdasarkan UUID Area' })
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan UUID master Instrument Name' })
  @IsOptional()
  @IsUUID()
  instrumentNameId?: string;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;
}
