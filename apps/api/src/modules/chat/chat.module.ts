import { Module } from '@nestjs/common';
import { ChatController } from './presentation/controllers/chat.controller';
import { ChatService } from './application/services/chat.service';
import { ConversationRepository } from './infrastructure/repositories/conversation.repository';
import { MessageRepository } from './infrastructure/repositories/message.repository';
import {
  CONVERSATION_REPOSITORY,
  MESSAGE_REPOSITORY,
} from './domain/ports';
import { ConfigModule } from '../../config/config.module';

/**
 * ChatModule - AI Chat functionality with SSE streaming
 *
 * Features:
 * - Create and manage conversations
 * - Send messages and receive streaming responses (proxied to Python AI service)
 * - Confirmation flow via Python LangGraph checkpoints
 *
 * Note: All AI logic (tool execution, context building, confirmation state)
 * has been migrated to the Python AI service. This module is now a thin
 * proxy + CRUD layer.
 *
 * @see docs/milestones/phase-1-counselor.md M1.2 for implementation details
 */
@Module({
  imports: [ConfigModule],
  controllers: [ChatController],
  providers: [
    // Application Services
    ChatService,

    // Repository implementations (injected via symbols for DI)
    ConversationRepository,
    MessageRepository,

    // Bind interfaces to implementations
    {
      provide: CONVERSATION_REPOSITORY,
      useExisting: ConversationRepository,
    },
    {
      provide: MESSAGE_REPOSITORY,
      useExisting: MessageRepository,
    },
  ],
  exports: [ChatService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ChatModule {}
