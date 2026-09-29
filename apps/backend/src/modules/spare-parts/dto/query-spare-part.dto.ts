import { ApiPropertyOptional } from '@nestjs/swagger';
import { SparePartStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QuerySparePartDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SparePartStatus })
  @IsOptional()
  @IsEnum(SparePartStatus)
  status?: SparePartStatus;
}
