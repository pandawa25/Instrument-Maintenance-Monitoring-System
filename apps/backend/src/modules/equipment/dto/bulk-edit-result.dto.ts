import { ApiProperty } from '@nestjs/swagger';

export class BulkEditFieldChangeDto {
  @ApiProperty({ description: 'Nama field (key), mis. "status"' })
  field!: string;

  @ApiProperty({ description: 'Label tampilan, mis. "Status"' })
  label!: string;

  @ApiProperty({ description: 'Nilai sebelum diubah' })
  before!: unknown;

  @ApiProperty({ description: 'Nilai baru yang akan diterapkan' })
  after!: unknown;
}

export class BulkEditPreviewRowDto {
  @ApiProperty()
  equipmentId!: string;

  @ApiProperty()
  tagNumber!: string;

  @ApiProperty({ type: [BulkEditFieldChangeDto], description: 'Kosong berarti tidak ada perubahan untuk equipment ini' })
  changes!: BulkEditFieldChangeDto[];
}

export class BulkEditPreviewResultDto {
  @ApiProperty({ description: 'Jumlah equipment yang dipilih' })
  totalSelected!: number;

  @ApiProperty({ description: 'Jumlah equipment yang datanya benar-benar berubah' })
  changedCount!: number;

  @ApiProperty({ description: 'Jumlah equipment yang nilainya sudah sama (tidak ikut di-commit)' })
  unchangedCount!: number;

  @ApiProperty({ type: [BulkEditPreviewRowDto] })
  rows!: BulkEditPreviewRowDto[];
}

export class BulkEditCommitResultDto {
  @ApiProperty({ description: 'ID EquipmentBulkOperation — dipakai untuk rollback' })
  operationId!: string;

  @ApiProperty({ description: 'Jumlah equipment yang berhasil diupdate' })
  updatedCount!: number;
}
