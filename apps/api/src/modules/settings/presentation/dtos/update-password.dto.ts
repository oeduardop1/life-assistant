import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentPassword123',
  })
  @IsString({ message: 'Senha atual é obrigatória' })
  @MinLength(1, { message: 'Senha atual é obrigatória' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password (8-72 chars, zxcvbn score >= 2)',
    example: 'newSecurePassword123!',
    minLength: 8,
    maxLength: 72,
  })
  @IsString({ message: 'Nova senha deve ser uma string' })
  @MinLength(8, { message: 'Nova senha deve ter pelo menos 8 caracteres' })
  @MaxLength(72, { message: 'Nova senha deve ter no máximo 72 caracteres' })
  newPassword: string;
}
