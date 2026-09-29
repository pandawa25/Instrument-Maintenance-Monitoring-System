import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePmPeriodDto {
  @ApiProperty({ example: '2026-04-01', description: 'Tanggal rencana periode ini' })
  @IsDateString()
  plannedDate!: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
