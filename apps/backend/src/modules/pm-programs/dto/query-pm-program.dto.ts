import { ApiPropertyOptional } from '@nestjs/swagger';
import { PmProgramStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPmProgramDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PmProgramStatus })
  @IsOptional()
  @IsEnum(PmProgramStatus)
  status?: PmProgramStatus;

  @ApiPropertyOptional({ description: 'Filter UUID vendor' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Filter UUID equipment (program yang mencakup equipment ini)' })
  @IsOptional()
  @IsUUID()
  equipmentId?: string;
}
