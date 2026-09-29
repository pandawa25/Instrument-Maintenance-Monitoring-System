import { ApiProperty } from '@nestjs/swagger';
import { PmExecutionResult, PmExecutionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ChecklistResultInputDto } from './checklist-result-input.dto';

export class UpdatePmPeriodExecutionDto {
  @ApiProperty({ required: false, example: '2026-04-03' })
  @IsOptional()
  @IsDateString()
  executionDate?: string;

  @ApiProperty({ enum: PmExecutionResult, required: false })
  @IsOptional()
  @IsEnum(PmExecutionResult)
  result?: PmExecutionResult;

  @ApiProperty({ required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  findings?: string;

  @ApiProperty({ required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  actionTaken?: string;

  @ApiProperty({ required: false, maxLength: 150, description: 'Nama teknisi/PIC dari pihak vendor' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  vendorPersonnel?: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @ApiProperty({ enum: PmExecutionStatus, required: false })
  @IsOptional()
  @IsEnum(PmExecutionStatus)
  status?: PmExecutionStatus;

  @ApiProperty({ type: [ChecklistResultInputDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistResultInputDto)
  checklistResults?: ChecklistResultInputDto[];
}
