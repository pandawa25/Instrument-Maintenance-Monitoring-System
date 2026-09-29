import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';

// Hanya 2 tipe yang boleh diinput manual dari API — MAINTENANCE_USAGE/MAINTENANCE_RETURN
// selalu otomatis dari MaintenanceService, tidak pernah dari endpoint ini.
export type ManualStockMovementType = 'RESTOCK' | 'ADJUSTMENT';

export class CreateStockMovementDto {
  @ApiProperty({ enum: ['RESTOCK', 'ADJUSTMENT'] })
  @IsIn(['RESTOCK', 'ADJUSTMENT'])
  type!: ManualStockMovementType;

  @ApiProperty({
    example: 10,
    description: 'Signed — RESTOCK harus positif, ADJUSTMENT boleh positif/negatif (hasil opname)',
  })
  @IsInt()
  @NotEquals(0)
  quantityDelta!: number;

  @ApiProperty({ required: false, maxLength: 255, example: 'Restock dari PO-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
