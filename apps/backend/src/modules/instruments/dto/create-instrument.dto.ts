import { ApiProperty } from '@nestjs/swagger';
import { Criticality, InstrumentStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateInstrumentDto {
  @ApiProperty({ example: 'PT-1001', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tagNumber!: string;

  @ApiProperty({ example: 'Pressure Transmitter Suction Pump 01', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  instrumentName!: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ description: 'UUID Area' })
  @IsUUID()
  areaId!: string;

  @ApiProperty({ description: 'UUID Instrument Type' })
  @IsUUID()
  instrumentTypeId!: string;

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

  @ApiProperty({ enum: InstrumentStatus, default: InstrumentStatus.ACTIVE, required: false })
  @IsOptional()
  @IsEnum(InstrumentStatus)
  status?: InstrumentStatus;

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
