import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

// Satu-satunya hal yang boleh diubah manual di WorkOrder lewat API — field ERP lain
// read-only (sumbernya import). equipmentId: null untuk melepas link yang salah/di-link
// otomatis keliru (balik ke "Antrian Belum Terhubung").
export class RelinkEquipmentDto {
  @ApiProperty({ required: false, nullable: true, description: 'UUID Equipment baru, atau null untuk melepas link' })
  @IsOptional()
  @IsUUID()
  equipmentId?: string | null;
}
