import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Budi Santoso', maxLength: 150 })
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: 'budi.santoso@company.com', maxLength: 150 })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 100, example: 'Passw0rd!' })
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @ApiProperty({ description: 'ID role (lihat GET /roles)' })
  @IsUUID()
  roleId!: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
