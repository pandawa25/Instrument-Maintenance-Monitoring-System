import { ApiProperty } from '@nestjs/swagger';
import { AreaStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'PU-01', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  areaCode!: string;

  @ApiProperty({ example: 'Process Unit 01', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  areaName!: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ enum: AreaStatus, default: AreaStatus.ACTIVE, required: false })
  @IsOptional()
  @IsEnum(AreaStatus)
  status?: AreaStatus;
}
