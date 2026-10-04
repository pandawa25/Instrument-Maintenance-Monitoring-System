import { ApiProperty } from '@nestjs/swagger';
import { Criticality, EquipmentStatus, FailAction } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Field yang BOLEH diubah lewat Edit Massal. SENGAJA TIDAK termasuk tagNumber, areaId,
 * & serialNumber — ketiganya identifier per-unit (tag number harus unik, area menentukan
 * prefix tag, serial number fisik per barang) sehingga mengubahnya secara massal berisiko
 * tinggi salah data kalau user keliru pilih baris. Lihat diskusi desain di roadmap.md.
 *
 * Sama seperti mode UPDATE_OR_CREATE di Bulk Upload: field yang TIDAK dikirim (undefined)
 * berarti "jangan ubah" — frontend hanya mengirim field yang di-checklist user.
 */
export class BulkEditFieldsDto {
  @ApiProperty({ required: false, maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  service?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ required: false, description: 'UUID master Instrument Name' })
  @IsOptional()
  @IsUUID()
  instrumentNameId?: string;

  @ApiProperty({ required: false, maxLength: 100 })
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

  @ApiProperty({ required: false, example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lrv?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  urv?: number;

  @ApiProperty({ required: false, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rating?: string;

  @ApiProperty({ enum: FailAction, required: false })
  @IsOptional()
  @IsEnum(FailAction)
  failAction?: FailAction;

  @ApiProperty({ enum: EquipmentStatus, required: false })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @ApiProperty({ enum: Criticality, required: false })
  @IsOptional()
  @IsEnum(Criticality)
  criticality?: Criticality;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

export class BulkEditEquipmentDto {
  @ApiProperty({ type: [String], description: 'Daftar ID equipment yang akan diubah (maks 1000)' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Pilih minimal 1 equipment' })
  @ArrayMaxSize(1000, { message: 'Maksimal 1000 equipment per operasi Edit Massal' })
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ type: BulkEditFieldsDto, description: 'Hanya kirim field yang ingin diubah' })
  @ValidateNested()
  @Type(() => BulkEditFieldsDto)
  data!: BulkEditFieldsDto;
}
