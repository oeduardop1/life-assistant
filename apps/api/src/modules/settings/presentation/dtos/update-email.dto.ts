import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmailDto {
  @ApiProperty({
    description: 'New email address',
    example: 'newemail@example.com',
  })
  @IsEmail({}, { message: 'Email deve ser um endereço válido' })
  newEmail: string;

  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentPassword123',
  })
  @IsString({ message: 'Senha atual é obrigatória' })
  @MinLength(1, { message: 'Senha atual é obrigatória' })
  currentPassword: string;
}
