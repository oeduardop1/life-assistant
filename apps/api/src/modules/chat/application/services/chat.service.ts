import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import {
  createLLMFromEnv,
  type LLMPort,
  type Message as LLMMessage,
} from '@life-assistant/ai';
import type { Conversation, Message } from '@life-assistant/database';
import { ContextBuilderService } from './context-builder.service';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import type { CreateConversationDto } from '../../presentation/dtos/create-conversation.dto';
import type { SendMessageDto } from '../../presentation/dtos/send-message.dto';

/**
 * SSE Message Event structure
 */
export interface MessageEvent {
  data: string | Record<string, unknown>;
  id?: string;
  type?: string;
}

/**
 * Chat service - Orchestrates chat interactions with LLM
 *
 * @see AI_SPECS.md §2 for architecture
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private llm: LLMPort;

  constructor(
    private readonly contextBuilder: ContextBuilderService,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository
  ) {
    this.llm = createLLMFromEnv();
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    dto: CreateConversationDto
  ): Promise<Conversation> {
    return this.conversationRepository.create(userId, {
      title: dto.title,
      type: dto.type ?? 'general',
    });
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(
    userId: string,
    conversationId: string
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findById(
      userId,
      conversationId
    );

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    return conversation;
  }

  /**
   * List all conversations for a user
   */
  async listConversations(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const [conversations, total] = await Promise.all([
      this.conversationRepository.findAllByUserId(userId, options),
      this.conversationRepository.countByUserId(userId),
    ]);

    return { conversations, total };
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ messages: Message[]; total: number }> {
    // Verify conversation exists and user owns it
    await this.getConversation(userId, conversationId);

    const [messages, total] = await Promise.all([
      this.messageRepository.findByConversationId(userId, conversationId, options),
      this.messageRepository.countByConversationId(userId, conversationId),
    ]);

    return { messages, total };
  }

  /**
   * Soft delete a conversation
   */
  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<void> {
    const deleted = await this.conversationRepository.softDelete(
      userId,
      conversationId
    );

    if (!deleted) {
      throw new NotFoundException('Conversa não encontrada');
    }
  }

  /**
   * Send a message and save it to the database
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto
  ): Promise<Message> {
    // Verify conversation exists
    await this.getConversation(userId, conversationId);

    // Save user message
    const userMessage = await this.messageRepository.create(userId, {
      conversationId,
      role: 'user',
      content: dto.content,
    });

    return userMessage;
  }

  /**
   * Stream LLM response for a conversation
   * Returns an Observable that emits SSE events
   */
  streamResponse(
    userId: string,
    conversationId: string
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // Process asynchronously
    this.processStreamResponse(userId, conversationId, subject).catch((error: unknown) => {
      this.logger.error('Stream error:', error);
      subject.next({
        data: { content: '', done: true, error: 'Erro ao processar resposta' },
      });
      subject.complete();
    });

    return subject.asObservable();
  }

  /**
   * Process the streaming response
   */
  private async processStreamResponse(
    userId: string,
    conversationId: string,
    subject: Subject<MessageEvent>
  ): Promise<void> {
    // Get conversation
    const conversation = await this.getConversation(userId, conversationId);

    // Build system prompt
    const systemPrompt = await this.contextBuilder.buildSystemPrompt(
      userId,
      conversation
    );

    // Get recent messages for context
    const recentMessages = await this.messageRepository.getRecentMessages(
      userId,
      conversationId,
      20 // Last 20 messages for context
    );

    // Convert to LLM message format
    const llmMessages: LLMMessage[] = recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Stream response from LLM
    let fullContent = '';

    const llmInfo = this.llm.getInfo();
    this.logger.log(`Starting LLM stream for conversation ${conversationId} using ${llmInfo.name}/${llmInfo.model}`);

    try {
      for await (const chunk of this.llm.stream({
        messages: llmMessages,
        systemPrompt,
      })) {
        fullContent += chunk.content;

        this.logger.debug(`Stream chunk: ${chunk.content.substring(0, 50)}... done=${String(chunk.done)}`);

        // NestJS SSE expects data as object, it handles JSON stringification
        subject.next({
          data: { content: chunk.content, done: chunk.done },
        });

        if (chunk.done) {
          this.logger.log('Stream completed with done=true');
          break;
        }
      }

      // Save assistant message after streaming completes
      this.logger.log(`Saving assistant message (${String(fullContent.length)} chars)`);
      await this.messageRepository.create(userId, {
        conversationId,
        role: 'assistant',
        content: fullContent,
        metadata: {
          provider: this.llm.getInfo().name,
          model: this.llm.getInfo().model,
        } as Record<string, unknown>,
      });

      this.logger.log('Stream response saved, completing subject');
      subject.complete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`LLM streaming error: ${errorMessage}`, errorStack);

      // Emit error event
      subject.next({
        data: {
          content: '',
          done: true,
          error: 'Erro ao gerar resposta. Por favor, tente novamente.',
        },
      });

      subject.complete();
      throw error;
    }
  }

  /**
   * Generate a title for a conversation based on the first message
   */
  async generateTitle(
    userId: string,
    conversationId: string
  ): Promise<string | null> {
    const messages = await this.messageRepository.findByConversationId(
      userId,
      conversationId,
      { limit: 2 }
    );

    if (messages.length === 0) {
      return null;
    }

    // Use first user message to generate title
    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (!firstUserMessage) {
      return null;
    }

    // Simple title generation: truncate first message
    const title =
      firstUserMessage.content.length > 50
        ? firstUserMessage.content.substring(0, 47) + '...'
        : firstUserMessage.content;

    // Update conversation title
    await this.conversationRepository.update(userId, conversationId, { title });

    return title;
  }
}
