import { ApiProperty } from '@nestjs/swagger';
import { ImportRowSeverity } from '@prisma/client';

export class WoImportBatchRowDto {
  @ApiProperty({ description: 'Nomor baris di file Excel (baris 1 = header)' })
  rowNumber!: number;

  @ApiProperty({ enum: ImportRowSeverity })
  severity!: ImportRowSeverity;

  @ApiProperty({ type: [String], description: 'Daftar catatan/error untuk baris ini' })
  messages!: string[];

  @ApiProperty({ description: 'Nilai yang sudah di-parse dari kolom Excel untuk baris ini (untuk ditampilkan di UI)' })
  raw!: Record<string, unknown>;
}
