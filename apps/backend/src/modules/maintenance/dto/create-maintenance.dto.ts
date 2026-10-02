import { ApiProperty } from '@nestjs/swagger';
import { Criticality, FailureCategory, MaintenanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
  ValidateNested,
} from 'class-validator';
import { MaterialInputDto } from './material-input.dto';

// Catatan: tidak ada field areaId di sini secara sengaja — area_id di record
// corrective_maintenance didenormalisasi dari instrument.area_id, dan disinkronkan
// oleh MaintenanceService, bukan diinput langsung oleh client (lihat design-document.md).
// createdById juga tidak di sini — diambil dari JWT user yang sedang login (CurrentUser).
export class CreateMaintenanceDto {
  @ApiProperty({
    example: 'ESPK-2026-0001',
    maxLength: 50,
    description: 'Nomor e-SPK — diisi manual, diambil dari aplikasi e-SPK eksternal (bukan di-generate sistem ini)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  spkNumber!: string;

  @ApiProperty({ example: '2026-09-20' })
  @IsDateString()
  maintenanceDate!: string;

  @ApiProperty({ description: 'UUID Equipment' })
  @IsUUID()
  equipmentId!: string;

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

  @ApiProperty({ description: 'UUID User (technician utama)' })
  @IsUUID()
  technicianId!: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'UUID technician TAMBAHAN (anggota tim), selain technician utama di atas',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  additionalTechnicianIds?: string[];

  @ApiProperty({ enum: Criticality, default: Criticality.MEDIUM, required: false, description: 'Prioritas pekerjaan' })
  @IsOptional()
  @IsEnum(Criticality)
  priority?: Criticality;

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

  @ApiProperty({ default: false, required: false, description: 'Apakah maintenance ini butuh spare part / material' })
  @IsOptional()
  @IsBoolean()
  needsSparePart?: boolean;

  @ApiProperty({
    type: [MaterialInputDto],
    required: false,
    description: 'Daftar kebutuhan material — hanya relevan bila needsSparePart = true',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialInputDto)
  materials?: MaterialInputDto[];

  // --- Referensi Notifikasi & Work Order dari ERP (mis. SAP PM) — diisi
  // manual setelah diterbitkan di sana, semua opsional & free-text. ---

  @ApiProperty({ required: false, maxLength: 50, description: 'Nomor notifikasi dari ERP' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  notificationNumber?: string;

  @ApiProperty({ required: false, example: '2026-09-20' })
  @IsOptional()
  @IsDateString()
  notificationDate?: string;

  @ApiProperty({ required: false, maxLength: 50, description: 'Status notifikasi dari ERP' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  notificationStatus?: string;

  @ApiProperty({ required: false, maxLength: 50, description: 'Nomor Work Order dari ERP' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  workOrderNumber?: string;

  @ApiProperty({ required: false, example: '2026-09-21' })
  @IsOptional()
  @IsDateString()
  workOrderDate?: string;

  @ApiProperty({ required: false, maxLength: 50, description: 'Status Work Order dari ERP' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  workOrderStatus?: string;
}
