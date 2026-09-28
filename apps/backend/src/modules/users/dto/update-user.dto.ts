import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsUUID, MaxLength } from 'class-validator';

// Sengaja bukan PartialType(CreateUserDto) — update profil tidak boleh membawa field password.
// Ganti password punya endpoint & DTO sendiri (ChangePasswordDto).
export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ description: 'ID role (lihat GET /roles)' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
