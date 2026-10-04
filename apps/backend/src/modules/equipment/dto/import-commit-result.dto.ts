import { ApiProperty } from '@nestjs/swagger';
import { ImportBatchStatus } from '@prisma/client';

export class ImportCommitResultDto {
  @ApiProperty()
  batchId!: string;

  @ApiProperty({ enum: ImportBatchStatus })
  status!: ImportBatchStatus;

  @ApiProperty({ description: 'Jumlah equipment yang berhasil dibuat' })
  createdCount!: number;

  @ApiProperty({ description: 'Jumlah equipment existing yang berhasil di-update (mode UPDATE_OR_CREATE)' })
  updatedCount!: number;

  @ApiProperty({ required: false, description: 'ID EquipmentBulkOperation — dipakai untuk rollback, hanya ada kalau updatedCount > 0' })
  operationId?: string;

  @ApiProperty()
  committedAt!: Date;
}
