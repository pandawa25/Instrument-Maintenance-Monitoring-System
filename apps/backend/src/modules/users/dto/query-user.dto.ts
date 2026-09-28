import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Filter khusus module Manage User, ditambahkan di atas kontrak pagination standar.
export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by role ID' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ description: "Filter status aktif — 'true' atau 'false'" })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean;
}
