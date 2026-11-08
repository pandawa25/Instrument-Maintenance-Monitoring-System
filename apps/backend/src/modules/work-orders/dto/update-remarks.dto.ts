import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Satu-satunya field "bebas teks" yang boleh diedit di WorkOrder — bukan field ERP (lihat
// catatan di schema.prisma). null/string kosong = hapus catatan.
export class UpdateRemarksDto {
  @ApiProperty({ required: false, nullable: true, maxLength: 1000, description: 'Catatan manual internal, bukan dari ERP' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string | null;
}
