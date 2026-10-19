import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class BulkUploadSparePartDto {
  @ApiProperty({
    required: false,
    enum: ['CREATE_ONLY', 'UPDATE_OR_CREATE'],
    default: 'CREATE_ONLY',
    description: 'CREATE_ONLY: KIMAP yang sudah ada ditolak. UPDATE_OR_CREATE: KIMAP yang sudah ada di-update (kolom kosong tidak disentuh).',
  })
  @IsOptional()
  @IsIn(['CREATE_ONLY', 'UPDATE_OR_CREATE'])
  mode?: 'CREATE_ONLY' | 'UPDATE_OR_CREATE';
}
