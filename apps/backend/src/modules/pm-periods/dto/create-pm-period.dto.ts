import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePmPeriodDto {
  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 9999,
    example: 3,
    description: 'Nomor periode. Kosongkan untuk otomatis (nomor terbesar + 1). Harus unik per PM Program.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  periodNumber?: number;

  @ApiProperty({ example: '2026-04-01', description: 'Tanggal rencana periode ini' })
  @IsDateString()
  plannedDate!: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
