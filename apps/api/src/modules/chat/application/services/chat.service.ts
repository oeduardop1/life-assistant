import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type { Conversation, Message } from '@life-assistant/database';
import { AppConfigService } from '../../../../config/config.service';
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
 * Chat service - Proxy to Python AI service + conversation CRUD
 *
 * All AI logic (tool execution, context building, confirmation state)
 * has been migrated to the Python AI service. This service handles:
 * - Conversation and message CRUD
 * - SSE proxy to Python AI for streaming responses
 * - Confirmation proxy to Python LangGraph checkpoints
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository
  ) {}

  // ==========================================================================
  // Conversation CRUD
  // ==========================================================================

  async createConversation(
    userId: string,
    dto: CreateConversationDto
  ): Promise<Conversation> {
    return this.conversationRepository.create(userId, {
      title: dto.title,
      type: dto.type ?? 'general',
    });
  }

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

  async getMessages(
    userId: string,
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ messages: Message[]; total: number }> {
    await this.getConversation(userId, conversationId);

    const [messages, total] = await Promise.all([
      this.messageRepository.findByConversationId(userId, conversationId, options),
      this.messageRepository.countByConversationId(userId, conversationId),
    ]);

    return { messages, total };
  }

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

  // ==========================================================================
  // Message Handling
  // ==========================================================================

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto
  ): Promise<Message> {
    await this.getConversation(userId, conversationId);

    const userMessage = await this.messageRepository.create(userId, {
      conversationId,
      role: 'user',
      content: dto.content,
    });

    return userMessage;
  }

  /**
   * Stream LLM response for a conversation via Python AI service proxy
   */
  streamResponse(
    userId: string,
    conversationId: string
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.proxyToPython(userId, conversationId, subject).catch((error: unknown) => {
      this.logger.error('Stream error:', error);
      subject.next({
        data: { content: '', done: true, error: 'Erro ao processar resposta' },
      });
      subject.complete();
    });

    return subject.asObservable();
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

    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (!firstUserMessage) {
      return null;
    }

    const title =
      firstUserMessage.content.length > 50
        ? firstUserMessage.content.substring(0, 47) + '...'
        : firstUserMessage.content;

    await this.conversationRepository.update(userId, conversationId, { title });

    return title;
  }

  // ==========================================================================
  // Confirmation Proxy (Python LangGraph checkpoints)
  // ==========================================================================

  /**
   * Confirm a pending tool execution via Python AI service
   */
  confirmToolExecution(
    _userId: string,
    conversationId: string,
    _confirmationId: string
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.proxyConfirmToPython(conversationId, 'confirm', subject).catch(
      (error: unknown) => {
        this.logger.error('Python confirm proxy error:', error);
        subject.next({
          data: {
            content: 'Erro ao executar a ação. Por favor, tente novamente.',
            done: true,
            error: 'execution_error',
          },
        } as MessageEvent);
        subject.complete();
      }
    );

    return subject.asObservable();
  }

  /**
   * Reject a pending tool execution via Python AI service
   */
  async rejectToolExecution(
    _userId: string,
    conversationId: string,
    _confirmationId: string,
    _reason?: string
  ): Promise<{ success: boolean; message: string }> {
    await this.proxyRejectToPython(conversationId);
    return {
      success: true,
      message: 'Tudo bem, não vou registrar essa informação.',
    };
  }

  // ==========================================================================
  // Python AI Service Proxy
  // ==========================================================================

  /**
   * Proxy chat to Python AI service via SSE streaming
   */
  private async proxyToPython(
    userId: string,
    conversationId: string,
    subject: Subject<MessageEvent>
  ): Promise<void> {
    const recentMessages = await this.messageRepository.getRecentMessages(
      userId,
      conversationId,
      1
    );
    const lastUserMessage = recentMessages.findLast(m => m.role === 'user');
    if (!lastUserMessage) {
      subject.next({
        data: { content: 'Nenhuma mensagem encontrada.', done: true },
      });
      subject.complete();
      return;
    }

    const pythonUrl = this.appConfig.pythonAiUrl;
    const serviceSecret = this.appConfig.serviceSecret;

    this.logger.log(
      `Proxying to Python AI: ${pythonUrl}/chat/invoke for conversation ${conversationId}`
    );

    const response = await fetch(`${pythonUrl}/chat/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        conversation_id: conversationId,
        message: lastUserMessage.content,
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => 'Unknown error');
      this.logger.error(`Python AI error (${String(response.status)}): ${errorText}`);
      subject.next({
        data: {
          content: '',
          done: true,
          error: 'Erro ao conectar com o serviço de IA',
        },
      });
      subject.complete();
      return;
    }

    await this.parsePythonSSEStream(response, subject);
  }

  /**
   * Parse an SSE stream from the Python AI service and emit events to a Subject
   */
  private async parsePythonSSEStream(
    response: Response,
    subject: Subject<MessageEvent>
  ): Promise<void> {
    if (!response.body) {
      subject.complete();
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      let readResult = await reader.read();
      while (!readResult.done) {
        buffer += decoder.decode(readResult.value as Uint8Array, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr) as Record<string, unknown>;
              if (data.type && typeof data.type === 'string') {
                subject.next({
                  type: data.type,
                  data: (data.data ?? data) as Record<string, unknown>,
                } as MessageEvent);
              } else {
                subject.next({ data } as MessageEvent);
              }
            } catch {
              this.logger.warn(`Malformed SSE data: ${dataStr}`);
            }
          }
        }

        readResult = await reader.read();
      }
    } finally {
      reader.releaseLock();
    }

    subject.complete();
  }

  /**
   * Proxy a confirm/reject action to the Python AI service's /chat/resume endpoint
   */
  private async proxyConfirmToPython(
    conversationId: string,
    action: 'confirm' | 'reject',
    subject: Subject<MessageEvent>
  ): Promise<void> {
    const pythonUrl = this.appConfig.pythonAiUrl;
    const serviceSecret = this.appConfig.serviceSecret;

    this.logger.log(
      `Proxying ${action} to Python AI: ${pythonUrl}/chat/resume for conversation ${conversationId}`
    );

    const response = await fetch(`${pythonUrl}/chat/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ thread_id: conversationId, action }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => 'Unknown error');
      this.logger.error(`Python AI resume error (${String(response.status)}): ${errorText}`);
      subject.next({
        data: {
          content: '',
          done: true,
          error: 'Erro ao conectar com o serviço de IA',
        },
      } as MessageEvent);
      subject.complete();
      return;
    }

    await this.parsePythonSSEStream(response, subject);
  }

  /**
   * Proxy a reject action to the Python AI service (non-streaming response)
   */
  private async proxyRejectToPython(
    conversationId: string
  ): Promise<void> {
    const pythonUrl = this.appConfig.pythonAiUrl;
    const serviceSecret = this.appConfig.serviceSecret;

    const response = await fetch(`${pythonUrl}/chat/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ thread_id: conversationId, action: 'reject' }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      this.logger.error(`Python AI reject error (${String(response.status)}): ${errorText}`);
    }
  }
}
