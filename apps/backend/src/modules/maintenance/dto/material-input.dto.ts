import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';

/**
 * Bentuk 1 baris kebutuhan material saat create/update Corrective Maintenance.
 * Dikirim sebagai array utuh — server akan replace seluruh baris material lama
 * (MVP: cukup daftar kebutuhan, tanpa tracking status pemenuhan per item).
 */
export class MaterialInputDto {
  @ApiProperty({ description: 'UUID master Spare Part / Material' })
  @IsUUID()
  sparePartId!: string;

  @ApiProperty({ example: 2, description: 'Jumlah kebutuhan' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}
