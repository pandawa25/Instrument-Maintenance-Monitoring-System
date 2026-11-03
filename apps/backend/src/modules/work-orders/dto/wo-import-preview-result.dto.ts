import { ApiProperty } from '@nestjs/swagger';

export class WoImportPreviewResultDto {
  @ApiProperty({ description: 'ID batch — dipakai untuk lihat detail baris & commit' })
  batchId!: string;

  @ApiProperty({ example: 'WO 01012026.xlsx' })
  filename!: string;

  @ApiProperty({ description: 'Jumlah baris data (tidak termasuk header & baris kosong)' })
  totalRows!: number;

  @ApiProperty({ description: 'Baris valid, equipment berhasil di-match' })
  okRows!: number;

  @ApiProperty({
    description: 'Baris valid tapi ada catatan (equipment tidak ter-match — tetap ikut ter-commit, masuk antrian)',
  })
  warningRows!: number;

  @ApiProperty({ description: 'Baris tidak valid (mis. Order/Notification kosong) — HARUS 0 sebelum bisa commit' })
  errorRows!: number;

  @ApiProperty({ description: 'Batas waktu batch ini masih boleh di-commit' })
  expiresAt!: Date;

  @ApiProperty({ description: 'true kalau errorRows === 0 (boleh langsung commit)' })
  canCommit!: boolean;
}
