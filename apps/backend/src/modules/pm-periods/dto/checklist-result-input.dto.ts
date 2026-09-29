import { ApiProperty } from '@nestjs/swagger';
import { PmChecklistResult } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChecklistResultInputDto {
  @ApiProperty({ description: 'UUID baris PmExecutionChecklistResult yang diupdate' })
  @IsUUID()
  id!: string;

  @ApiProperty({ enum: PmChecklistResult })
  @IsEnum(PmChecklistResult)
  result!: PmChecklistResult;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
