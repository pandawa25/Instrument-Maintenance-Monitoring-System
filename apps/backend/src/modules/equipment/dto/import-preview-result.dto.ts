import { ApiProperty } from '@nestjs/swagger';

export class ImportPreviewResultDto {
  @ApiProperty({ description: 'ID batch — dipakai untuk lihat detail baris & commit' })
  batchId!: string;

  @ApiProperty({ example: 'equipment-2026-09.xlsx' })
  filename!: string;

  @ApiProperty({ description: 'Jumlah baris data (tidak termasuk header & baris kosong)' })
  totalRows!: number;

  @ApiProperty({ description: 'Baris valid, siap di-commit tanpa catatan' })
  okRows!: number;

  @ApiProperty({ description: 'Baris valid tapi ada catatan (tetap ikut ter-commit)' })
  warningRows!: number;

  @ApiProperty({ description: 'Baris tidak valid — HARUS 0 sebelum bisa commit' })
  errorRows!: number;

  @ApiProperty({ description: 'Batas waktu batch ini masih boleh di-commit' })
  expiresAt!: Date;

  @ApiProperty({ description: 'true kalau errorRows === 0 (boleh langsung commit)' })
  canCommit!: boolean;
}
