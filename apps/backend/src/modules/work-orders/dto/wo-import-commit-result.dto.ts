import { ApiProperty } from '@nestjs/swagger';
import { ImportBatchStatus } from '@prisma/client';

export class WoImportCommitResultDto {
  @ApiProperty()
  batchId!: string;

  @ApiProperty({ enum: ImportBatchStatus })
  status!: ImportBatchStatus;

  @ApiProperty({ description: 'Jumlah Notification yang dibuat/di-upsert' })
  notificationCount!: number;

  @ApiProperty({ description: 'Jumlah Work Order yang dibuat/di-upsert' })
  workOrderCount!: number;

  @ApiProperty({ description: 'Jumlah baris yang equipment-nya tidak ter-match otomatis (masuk antrian)' })
  unmatchedCount!: number;

  @ApiProperty()
  committedAt!: Date;
}
