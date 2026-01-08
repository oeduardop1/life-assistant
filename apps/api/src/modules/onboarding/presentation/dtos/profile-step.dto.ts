import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileStepDto {
  @ApiProperty({
    description: 'User display name',
    example: 'Maria Silva',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must be at most 100 characters long' })
  name: string;

  @ApiProperty({
    description: 'User timezone in IANA format',
    example: 'America/Sao_Paulo',
  })
  @IsString({ message: 'Timezone must be a string' })
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+$/, {
    message: 'Timezone must be a valid IANA timezone (e.g., America/Sao_Paulo)',
  })
  timezone: string;
}
