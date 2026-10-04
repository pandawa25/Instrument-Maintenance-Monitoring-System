import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateRolePermissionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  canView!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canCreate!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canEdit!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canDelete!: boolean;
}
