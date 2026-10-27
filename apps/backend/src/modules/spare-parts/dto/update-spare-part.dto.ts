import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { CreateSparePartDto } from './create-spare-part.dto';

// `stock` sengaja di-omit dari update — stock TIDAK BOLEH ditimpa langsung lewat PATCH.
// Perubahan stock harian wajib lewat POST /spare-parts/:id/stock-movements.
// Satu-satunya pengecualian adalah `openingStock` (koreksi SALDO AWAL, mengikuti hak edit Spare Part): service
// menulis ulang baris ledger INITIAL_BALANCE dan menggeser saldo baris sesudahnya, sehingga
// invarian stock = saldo awal + total mutasi tetap terjaga.
export class UpdateSparePartDto extends PartialType(OmitType(CreateSparePartDto, ['stock'] as const)) {
  @ApiProperty({
    required: false,
    example: 25,
    description: 'Koreksi saldo awal (butuh hak edit Spare Part). Stock saat ini ikut bergeser sebesar selisihnya.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingStock?: number;
}
