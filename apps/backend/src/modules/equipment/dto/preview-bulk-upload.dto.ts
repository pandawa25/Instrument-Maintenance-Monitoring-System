import { ApiProperty } from '@nestjs/swagger';
import { ImportMode } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class PreviewBulkUploadDto {
  @ApiProperty({
    enum: ImportMode,
    required: false,
    default: ImportMode.CREATE_ONLY,
    description:
      'CREATE_ONLY (default): tag number yang sudah ada equipment aktif akan ditolak (ERROR). ' +
      'UPDATE_OR_CREATE: tag yang sudah ada akan di-UPDATE memakai data dari file (hanya kolom yang diisi ' +
      'di Excel yang ditimpa — kolom kosong tidak mengubah nilai existing), tag yang belum ada tetap di-CREATE.',
  })
  @IsOptional()
  @IsEnum(ImportMode)
  mode?: ImportMode;
}
