import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTimezoneDto {
  @ApiProperty({
    description: 'IANA timezone string',
    example: 'America/Sao_Paulo',
    pattern: '^[A-Za-z_]+/[A-Za-z_]+$',
  })
  @IsString({ message: 'Timezone deve ser uma string' })
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+$/, {
    message: 'Timezone deve estar no formato IANA (ex: America/Sao_Paulo)',
  })
  timezone: string;
}
