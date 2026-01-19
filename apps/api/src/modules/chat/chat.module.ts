import { Module } from '@nestjs/common';
import { ChatController } from './presentation/controllers/chat.controller';
import { ChatService } from './application/services/chat.service';
import { ContextBuilderService } from './application/services/context-builder.service';
import { ConversationRepository } from './infrastructure/repositories/conversation.repository';
import { MessageRepository } from './infrastructure/repositories/message.repository';
import {
  CONVERSATION_REPOSITORY,
  MESSAGE_REPOSITORY,
} from './domain/ports';
import { MemoryModule } from '../memory/memory.module';

/**
 * ChatModule - AI Chat functionality with SSE streaming
 *
 * Features:
 * - Create and manage conversations
 * - Send messages and receive streaming responses
 * - Support for different conversation types (general, counselor)
 *
 * @see docs/milestones/phase-1-counselor.md M1.2 for implementation details
 * @see docs/specs/ai.md §4 for system prompts
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
@Module({
  imports: [MemoryModule],
  controllers: [ChatController],
  providers: [
    // Application Services
    ChatService,
    ContextBuilderService,

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
