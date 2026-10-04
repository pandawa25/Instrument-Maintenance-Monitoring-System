import { ApiProperty } from '@nestjs/swagger';
import { BulkOperationSource, BulkOperationStatus } from '@prisma/client';

export class BulkOperationListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: BulkOperationSource })
  source!: BulkOperationSource;

  @ApiProperty({ enum: BulkOperationStatus })
  status!: BulkOperationStatus;

  @ApiProperty({ description: 'Jumlah equipment yang terdampak operasi ini' })
  affectedCount!: number;

  @ApiProperty()
  createdBy!: { id: string; fullName: string };

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  revertedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  revertedBy?: { id: string; fullName: string } | null;

  @ApiProperty({ required: false, nullable: true, description: 'Terisi kalau source = IMPORT_UPSERT' })
  importBatch?: { id: string; filename: string } | null;
}

export class RevertRowDto {
  @ApiProperty()
  equipmentId!: string;

  @ApiProperty()
  tagNumber!: string;

  @ApiProperty({ required: false, description: 'Alasan dilewati — hanya ada di daftar conflicted' })
  reason?: string;
}

export class RevertPreviewResultDto {
  @ApiProperty()
  operationId!: string;

  @ApiProperty()
  totalSnapshots!: number;

  @ApiProperty({ description: 'Jumlah equipment yang AMAN direstore' })
  restorableCount!: number;

  @ApiProperty({ description: 'Jumlah equipment yang DILEWATI karena sudah berubah lagi setelah operasi ini, atau sudah dihapus' })
  conflictedCount!: number;

  @ApiProperty({ type: [RevertRowDto] })
  restorable!: RevertRowDto[];

  @ApiProperty({ type: [RevertRowDto] })
  conflicted!: RevertRowDto[];
}

export class RevertCommitResultDto {
  @ApiProperty()
  operationId!: string;

  @ApiProperty({ description: 'Jumlah equipment yang berhasil direstore ke nilai sebelum operasi ini' })
  restoredCount!: number;

  @ApiProperty({ description: 'Jumlah equipment yang dilewati (konflik/sudah terhapus)' })
  skippedCount!: number;
}
