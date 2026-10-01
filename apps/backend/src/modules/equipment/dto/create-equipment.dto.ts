import { ApiProperty } from '@nestjs/swagger';
import { Criticality, EquipmentStatus, FailAction } from '@prisma/client';
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

  // Size/Rating/FailAction: khusus equipment valve (Control Valve, Solenoid Valve,
  // On-Off Valve, On-Off Valve SIS — kode CV/SV/KV/UV). Sengaja tidak ada validasi
  // "wajib diisi kalau instrument type X" di level DTO ini — sama seperti lrv/urv,
  // show/hide field per tipe instrument murni urusan UX frontend (MVP).
  @ApiProperty({ required: false, maxLength: 50, example: '2"' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;

  @ApiProperty({ required: false, maxLength: 50, example: 'ANSI 600' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rating?: string;

  @ApiProperty({ enum: FailAction, required: false, description: 'Posisi fail-safe aktuator (khusus valve)' })
  @IsOptional()
  @IsEnum(FailAction)
  failAction?: FailAction;

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
