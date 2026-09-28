import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ImportRowSeverity } from '@prisma/client';

export class QueryImportRowsDto {
  @ApiPropertyOptional({ enum: ImportRowSeverity, description: 'Filter severity — kosongkan untuk semua' })
  @IsOptional()
  @IsEnum(ImportRowSeverity)
  severity?: ImportRowSeverity;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
