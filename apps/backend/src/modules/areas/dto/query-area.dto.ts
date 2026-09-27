import { ApiPropertyOptional } from '@nestjs/swagger';
import { AreaStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Filter khusus module Area, ditambahkan di atas kontrak pagination standar.
export class QueryAreaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AreaStatus })
  @IsOptional()
  @IsEnum(AreaStatus)
  status?: AreaStatus;
}
