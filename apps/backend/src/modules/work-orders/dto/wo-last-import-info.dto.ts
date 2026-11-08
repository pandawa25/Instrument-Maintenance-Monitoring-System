import { ApiProperty } from '@nestjs/swagger';

// Ringkasan batch import TERKOMIT terakhir untuk entityType WORK_ORDER — dipakai info
// "Data terakhir diupdate ..." di atas list. null kalau belum pernah ada import yang commit
// sama sekali (mis. environment baru).
export class WoLastImportInfoDto {
  @ApiProperty({ nullable: true })
  committedAt!: Date | null;

  @ApiProperty({ nullable: true })
  filename!: string | null;

  @ApiProperty({ nullable: true })
  totalRows!: number | null;

  @ApiProperty({ nullable: true })
  okRows!: number | null;

  @ApiProperty({ nullable: true })
  warningRows!: number | null;

  @ApiProperty({ nullable: true })
  errorRows!: number | null;
}
