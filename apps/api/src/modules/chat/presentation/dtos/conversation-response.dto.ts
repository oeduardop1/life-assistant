import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for a single message
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Message unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Conversation ID this message belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  conversationId: string;

  @ApiProperty({
    description: 'Message role',
    enum: ['user', 'assistant', 'system'],
    example: 'user',
  })
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({
    description: 'Message content',
    example: 'Olá, como posso organizar melhor meu dia?',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { tokens: 150 },
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}

/**
 * Response DTO for a conversation
 */
export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns the conversation',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Conversation title',
    example: 'Conversa sobre metas',
  })
  title?: string;

  @ApiProperty({
    description: 'Conversation type',
    enum: ['general', 'counselor'],
    example: 'general',
  })
  type: 'general' | 'counselor';

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { context: 'productivity' },
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Conversation creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:35:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Response DTO for conversation list
 */
export class ConversationListResponseDto {
  @ApiProperty({
    description: 'List of conversations',
    type: [ConversationResponseDto],
  })
  conversations: ConversationResponseDto[];

  @ApiProperty({
    description: 'Total count of conversations',
    example: 10,
  })
  total: number;
}

/**
 * Response DTO for messages list
 */
export class MessageListResponseDto {
  @ApiProperty({
    description: 'List of messages',
    type: [MessageResponseDto],
  })
  messages: MessageResponseDto[];

  @ApiProperty({
    description: 'Total count of messages',
    example: 25,
  })
  total: number;
}

/**
 * Response DTO for SSE streaming chunks
 */
export class StreamChunkDto {
  @ApiProperty({
    description: 'Content chunk from LLM',
    example: 'Para organizar melhor seu dia, ',
  })
  content: string;

  @ApiProperty({
    description: 'Whether this is the final chunk',
    example: false,
  })
  done: boolean;
}

/**
 * Response DTO for send message result
 */
export class SendMessageResponseDto {
  @ApiProperty({
    description: 'The saved user message',
    type: MessageResponseDto,
  })
  userMessage: MessageResponseDto;

  @ApiProperty({
    description: 'URL for SSE stream to receive assistant response',
    example: '/api/chat/conversations/123/stream',
  })
  streamUrl: string;
}
