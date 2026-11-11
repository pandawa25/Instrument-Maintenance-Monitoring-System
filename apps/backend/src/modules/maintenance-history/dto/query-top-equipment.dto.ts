import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryTopEquipmentDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50, description: 'Jumlah equipment teratas per kategori (Corrective / PM)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({ default: 6, minimum: 1, maximum: 60, description: 'Rentang data: N bulan terakhir' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  months: number = 6;
}
