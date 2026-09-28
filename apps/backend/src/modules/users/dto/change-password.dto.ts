import { ApiProperty } from '@nestjs/swagger';
import { MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ minLength: 8, maxLength: 100, example: 'PasswordBaru123!' })
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}
