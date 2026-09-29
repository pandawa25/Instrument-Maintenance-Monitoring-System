import { ApiProperty } from '@nestjs/swagger';
import { PmFrequencyUnit, PmProgramStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PmChecklistItemInputDto } from './pm-checklist-item-input.dto';

export class CreatePmProgramDto {
  @ApiProperty({ example: 'PM ATG 3 Bulanan', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 3, description: 'Nilai interval frekuensi' })
  @IsInt()
  @Min(1)
  frequencyValue!: number;

  @ApiProperty({ enum: PmFrequencyUnit, example: PmFrequencyUnit.MONTH })
  @IsEnum(PmFrequencyUnit)
  frequencyUnit!: PmFrequencyUnit;

  @ApiProperty({ description: 'UUID Vendor pelaksana' })
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ example: '2026-01-01', description: 'Tanggal mulai berlaku / acuan Periode 1' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ enum: PmProgramStatus, default: PmProgramStatus.ACTIVE, required: false })
  @IsOptional()
  @IsEnum(PmProgramStatus)
  status?: PmProgramStatus;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @ApiProperty({ type: [String], description: 'Daftar UUID Equipment yang dicakup program ini' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  equipmentIds!: string[];

  @ApiProperty({ type: [PmChecklistItemInputDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PmChecklistItemInputDto)
  checklistItems?: PmChecklistItemInputDto[];
}
