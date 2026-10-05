import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';

// Hanya 3 tipe yang boleh diinput manual dari API — MAINTENANCE_USAGE/MAINTENANCE_RETURN
// selalu otomatis dari MaintenanceService, tidak pernah dari endpoint ini.
export type ManualStockMovementType = 'RESTOCK' | 'STOCK_OUT' | 'ADJUSTMENT';

export class CreateStockMovementDto {
  @ApiProperty({ enum: ['RESTOCK', 'STOCK_OUT', 'ADJUSTMENT'] })
  @IsIn(['RESTOCK', 'STOCK_OUT', 'ADJUSTMENT'])
  type!: ManualStockMovementType;

  @ApiProperty({
    example: 10,
    description:
      'Selalu kirim angka POSITIF untuk RESTOCK (Stock In) & STOCK_OUT (Stock Out) — tanda minus untuk ' +
      'STOCK_OUT otomatis diterapkan di service. ADJUSTMENT boleh positif/negatif (hasil opname) sesuai apa adanya.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @NotEquals(0)
  quantityDelta!: number;

  @ApiProperty({
    required: false,
    example: '2026-10-05',
    description:
      'Tanggal transaksi (kapan barang benar-benar masuk/keluar), yyyy-mm-dd. Kosong = hari ini. Tidak boleh di masa depan.',
  })
  @IsOptional()
  @IsDateString()
  movementDate?: string;

  @ApiProperty({ required: false, maxLength: 255, example: 'Restock dari PO-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
