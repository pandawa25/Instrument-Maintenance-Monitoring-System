import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';

/**
 * Bentuk 1 baris checklist item saat create/update PM Program.
 * Dikirim sebagai array utuh — server akan replace seluruh checklist item lama.
 */
export class PmChecklistItemInputDto {
  @ApiProperty({ description: 'UUID master PM Activity Type' })
  @IsUUID()
  activityTypeId!: string;

  @ApiProperty({ required: false, maxLength: 255, example: 'Cek zero & span di titik 0% dan 50%' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
