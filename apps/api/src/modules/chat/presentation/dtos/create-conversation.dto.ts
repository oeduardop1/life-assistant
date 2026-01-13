import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new conversation
 *
 * @see SYSTEM_SPECS.md §3.2 for conversation types
 */
export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Conversation title',
    example: 'Conversa sobre metas',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Conversation type',
    enum: ['general', 'counselor'],
    default: 'general',
    example: 'general',
  })
  @IsOptional()
  @IsIn(['general', 'counselor'])
  type?: 'general' | 'counselor' = 'general';
}
