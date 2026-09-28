import { ApiProperty } from '@nestjs/swagger';
import { ImportBatchStatus } from '@prisma/client';

export class ImportCommitResultDto {
  @ApiProperty()
  batchId!: string;

  @ApiProperty({ enum: ImportBatchStatus })
  status!: ImportBatchStatus;

  @ApiProperty({ description: 'Jumlah equipment yang berhasil dibuat' })
  createdCount!: number;

  @ApiProperty()
  committedAt!: Date;
}
