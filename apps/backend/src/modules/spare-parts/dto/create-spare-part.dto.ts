import { ApiProperty } from '@nestjs/swagger';
import { SparePartStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from 'class-validator';

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

  @ApiProperty({ example: 10, default: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

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
