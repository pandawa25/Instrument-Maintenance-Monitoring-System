import { ApiProperty } from '@nestjs/swagger';
import { Criticality, EquipmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEquipmentDto {
  @ApiProperty({
    example: 'PU-01-PT-1001',
    maxLength: 50,
    description: 'Format: {Area Code}-{Tag No}. Frontend otomatis menempelkan prefix area saat area dipilih.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tagNumber!: string;

  @ApiProperty({ example: 'Pressure Transmitter Suction Pump 01', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  service!: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ description: 'UUID Area' })
  @IsUUID()
  areaId!: string;

  @ApiProperty({ description: 'UUID master Instrument Name' })
  @IsUUID()
  instrumentNameId!: string;

  @ApiProperty({ required: false, maxLength: 100, example: 'Smart' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiProperty({ required: false, example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @ApiProperty({ required: false, example: 0, description: 'Lower Range Value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lrv?: number;

  @ApiProperty({ required: false, example: 100, description: 'Upper Range Value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  urv?: number;

  @ApiProperty({ required: false, maxLength: 20, example: 'barg' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ enum: EquipmentStatus, default: EquipmentStatus.ACTIVE, required: false })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @ApiProperty({ enum: Criticality, default: Criticality.MEDIUM, required: false })
  @IsOptional()
  @IsEnum(Criticality)
  criticality?: Criticality;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
