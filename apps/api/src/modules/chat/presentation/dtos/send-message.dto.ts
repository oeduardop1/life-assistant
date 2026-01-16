import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for sending a message to a conversation
 *
 * @see docs/specs/ai.md §4.1 for message handling
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Olá, como posso organizar melhor meu dia?',
    minLength: 1,
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}
