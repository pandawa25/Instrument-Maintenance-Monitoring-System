import { ApiPropertyOptional } from '@nestjs/swagger';
import { Criticality, EquipmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Filter khusus module Equipment: area, instrument name, manufacturer, criticality, status.
export class QueryEquipmentDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter berdasarkan UUID Area' })
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan UUID master Instrument Name' })
  @IsOptional()
  @IsUUID()
  instrumentNameId?: string;

  // Exact match (bukan `contains`) — value dropdown-nya diambil persis dari
  // GET /equipment/manufacturers, jadi tidak perlu partial match di sini.
  @ApiPropertyOptional({ description: 'Filter berdasarkan nilai persis kolom manufacturer' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ enum: Criticality })
  @IsOptional()
  @IsEnum(Criticality)
  criticality?: Criticality;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;
}
