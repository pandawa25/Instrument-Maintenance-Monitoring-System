import { ApiProperty } from '@nestjs/swagger';

export class BulkUploadRowErrorDto {
  @ApiProperty({ description: 'Nomor baris pada file Excel (baris 1 = header)', example: 5 })
  row!: number;

  @ApiProperty({ example: "Area code 'XX' tidak ditemukan" })
  message!: string;
}

export class BulkUploadResultDto {
  @ApiProperty({ description: 'Jumlah baris data (tidak termasuk header)', example: 10 })
  totalRows!: number;

  @ApiProperty({ description: 'Jumlah equipment baru yang berhasil dibuat', example: 7 })
  created!: number;

  @ApiProperty({ description: 'Jumlah equipment existing yang berhasil diupdate', example: 2 })
  updated!: number;

  @ApiProperty({ description: 'Jumlah baris yang gagal diproses', example: 1 })
  failed!: number;

  @ApiProperty({ type: [BulkUploadRowErrorDto] })
  errors!: BulkUploadRowErrorDto[];
}
