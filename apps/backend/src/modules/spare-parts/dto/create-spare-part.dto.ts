import { ApiProperty } from '@nestjs/swagger';
import { SparePartStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateSparePartDto {
  @ApiProperty({ example: 'KM-001-2026', maxLength: 50, description: 'Kode KIMAP (unik)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  kimap!: string;

  @ApiProperty({ example: 'Diaphragm Seal 4 inch', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'pcs', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit!: string;

  // Decimal (bukan integer) — part dengan satuan non-bulat (meter kabel, liter
  // oli) butuh pecahan, bukan cuma pcs/unit bulat. Dibatasi 2 angka di belakang
  // koma, konsisten dengan kolom DB (`Decimal(10, 2)`).
  @ApiProperty({ example: 10, default: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock?: number;

  @ApiProperty({
    example: 5,
    default: 0,
    required: false,
    description: 'Ambang batas low-stock untuk Inventory Dashboard — 0 berarti baru ditandai saat stock habis',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minStock?: number;

  @ApiProperty({ enum: SparePartStatus, default: SparePartStatus.ACTIVE, required: false })
  @IsOptional()
  @IsEnum(SparePartStatus)
  status?: SparePartStatus;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
