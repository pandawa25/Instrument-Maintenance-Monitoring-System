import { ApiProperty } from '@nestjs/swagger';
import { FailureCategory, MaintenanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Catatan: tidak ada field areaId di sini secara sengaja — area_id di record
// corrective_maintenance didenormalisasi dari instrument.area_id, dan disinkronkan
// oleh MaintenanceService, bukan diinput langsung oleh client (lihat design-document.md).
// createdById juga tidak di sini — diambil dari JWT user yang sedang login (CurrentUser).
export class CreateMaintenanceDto {
  @ApiProperty({ example: '2026-09-20' })
  @IsDateString()
  maintenanceDate!: string;

  @ApiProperty({ description: 'UUID Instrument' })
  @IsUUID()
  instrumentId!: string;

  @ApiProperty({ enum: FailureCategory })
  @IsEnum(FailureCategory)
  failureCategory!: FailureCategory;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  problemDescription!: string;

  @ApiProperty({ required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rootCause?: string;

  @ApiProperty({ required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  actionTaken?: string;

  @ApiProperty({ required: false, example: 2.5, description: 'Downtime dalam jam' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9999)
  downtimeHours?: number;

  @ApiProperty({ description: 'UUID User (technician)' })
  @IsUUID()
  technicianId!: string;

  @ApiProperty({ enum: MaintenanceStatus, default: MaintenanceStatus.OPEN, required: false })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiProperty({ required: false, example: '2026-09-21' })
  @IsOptional()
  @IsDateString()
  completionDate?: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
