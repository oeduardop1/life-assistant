import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelegramStepDto {
  @ApiPropertyOptional({
    description: 'Telegram user ID (from bot verification)',
    example: '123456789',
  })
  @IsOptional()
  @IsString({ message: 'Telegram ID must be a string' })
  telegramId?: string;

  @ApiProperty({
    description: 'Whether user skipped Telegram connection',
    example: false,
  })
  @IsBoolean({ message: 'Skipped must be a boolean' })
  skipped: boolean;
}
