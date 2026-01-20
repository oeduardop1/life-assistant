import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import {
  createLLMFromEnv,
  runToolLoop,
  searchKnowledgeTool,
  addKnowledgeTool,
  analyzeContextTool,
  recordMetricTool,
  getTrackingHistoryTool,
  type LLMPort,
  type Message as LLMMessage,
  type ToolLoopConfig,
  type ToolDefinition,
  type ToolExecutor,
  type ToolCall,
  type ToolExecutionContext,
  type ToolExecutionResult,
  type PendingConfirmation,
  createErrorResult,
} from '@life-assistant/ai';
import type { Conversation, Message } from '@life-assistant/database';
import { ContextBuilderService } from './context-builder.service';
import { ConfirmationStateService, type StoredConfirmation } from './confirmation-state.service';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import { MemoryToolExecutorService } from '../../../memory/application/services/memory-tool-executor.service';
import { TrackingToolExecutorService } from '../../../tracking/application/services/tracking-tool-executor.service';
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
 * Chat service - Orchestrates chat interactions with LLM and Tool Use
 *
 * @see docs/specs/ai.md §2 for architecture
 * @see docs/specs/ai.md §6 for Tool Use Architecture
 * @see ADR-012 for Tool Use + Memory Consolidation
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly llm: LLMPort;

  /**
   * Tools currently available for the chat service.
   *
   * @see docs/specs/ai.md §6.2 for tool definitions
   * @see ADR-014 for analyze_context (Real-time Inference)
   * @see ADR-015 for Low Friction Tracking Philosophy
   */
  private readonly availableTools: ToolDefinition[] = [
    // Memory tools
    searchKnowledgeTool,
    addKnowledgeTool,
    analyzeContextTool,
    // Tracking tools (M2.1)
    recordMetricTool,
    getTrackingHistoryTool,
  ];

  /**
   * Tool name to executor mapping
   */
  private readonly toolToExecutorMap: Record<string, 'memory' | 'tracking'> = {
    search_knowledge: 'memory',
    add_knowledge: 'memory',
    analyze_context: 'memory',
    record_metric: 'tracking',
    get_tracking_history: 'tracking',
  };

  /**
   * Combined tool executor that routes to appropriate service
   */
  private readonly combinedExecutor: ToolExecutor;

  constructor(
    private readonly contextBuilder: ContextBuilderService,
    private readonly confirmationStateService: ConfirmationStateService,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly memoryToolExecutor: MemoryToolExecutorService,
    private readonly trackingToolExecutor: TrackingToolExecutorService
  ) {
    this.llm = createLLMFromEnv();

    // Create combined executor that routes to appropriate service
    this.combinedExecutor = {
      execute: async (toolCall: ToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const executorType = this.toolToExecutorMap[toolCall.name];

        switch (executorType) {
          case 'memory':
            return this.memoryToolExecutor.execute(toolCall, context);
          case 'tracking':
            return this.trackingToolExecutor.execute(toolCall, context);
          default:
            return createErrorResult(toolCall, new Error(`Unknown tool: ${toolCall.name}`));
        }
      },
    };
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
   * Process the streaming response with tool loop
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

    // Check for pending confirmation BEFORE starting tool loop
    // This handles user responses like "sim", "não", or corrections
    // Use findLast() to get the MOST RECENT user message (not the first one)
    const lastUserMessage = recentMessages.findLast(m => m.role === 'user')?.content ?? '';
    const handled = await this.handlePendingConfirmationFromMessage(
      userId,
      conversationId,
      lastUserMessage,
      subject
    );
    if (handled) {
      return;
    }

    // Convert to LLM message format
    const llmMessages: LLMMessage[] = recentMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
      content: msg.content,
    }));

    const llmInfo = this.llm.getInfo();
    this.logger.log(`Starting tool loop for conversation ${conversationId} using ${llmInfo.name}/${llmInfo.model}`);

    try {
      // Create tool loop config
      const toolLoopConfig: ToolLoopConfig = {
        tools: this.availableTools,
        executor: this.combinedExecutor,
        context: { userId, conversationId },
        systemPrompt,
        maxIterations: 5,
        onIteration: (iteration, response) => {
          this.logger.debug(`Tool loop iteration ${String(iteration)}: ${String(response.toolCalls?.length ?? 0)} tool calls`);

          // Emit tool call info via SSE
          if (response.toolCalls && response.toolCalls.length > 0) {
            subject.next({
              type: 'tool_calls',
              data: {
                iteration,
                toolCalls: response.toolCalls.map((tc) => ({
                  id: tc.id,
                  name: tc.name,
                  arguments: tc.arguments,
                })),
              },
            });
          }
        },
      };

      // Run tool loop - may pause for confirmation
      const result = await runToolLoop(this.llm, llmMessages, toolLoopConfig);

      // Check if tool loop paused for confirmation (ADR-015)
      if (result.pendingConfirmation) {
        await this.handlePendingConfirmation(
          userId,
          conversationId,
          result.pendingConfirmation,
          result.content,
          subject
        );
        return;
      }

      // Emit final content - handle empty responses
      let fullContent = result.content;
      this.logger.log(`Tool loop completed with ${String(result.iterations)} iterations, content length: ${String(fullContent.length)}`);

      // Fallback for empty responses (can happen due to API issues or LLM returning only tool calls)
      if (!fullContent || fullContent.trim().length === 0) {
        this.logger.warn('Empty response from LLM, using fallback message');
        fullContent = 'Desculpe, não consegui gerar uma resposta. Pode tentar novamente?';
      }

      // Stream content chunk by chunk for smoother UX
      subject.next({
        data: { content: fullContent, done: true },
      });

      // Build metadata with tool call info
      const metadata: Record<string, unknown> = {
        provider: llmInfo.name,
        model: llmInfo.model,
        iterations: result.iterations,
      };

      if (result.toolCalls.length > 0) {
        metadata.toolCalls = result.toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        }));
        metadata.toolResults = result.toolResults.map((tr) => ({
          toolCallId: tr.toolCallId,
          toolName: tr.toolName,
          success: tr.success,
          error: tr.error,
        }));
      }

      // Save assistant message
      this.logger.log(`Saving assistant message (${String(fullContent.length)} chars)`);
      await this.messageRepository.create(userId, {
        conversationId,
        role: 'assistant',
        content: fullContent,
        metadata,
      });

      this.logger.log('Tool loop response saved, completing subject');
      subject.complete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Tool loop error: ${errorMessage}`, errorStack);

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

  // ==========================================================================
  // Confirmation Intent Detection (ADR-015: Low Friction Tracking)
  // ==========================================================================

  /**
   * User intent when responding to a pending confirmation
   */
  private detectUserIntent(message: string): 'confirm' | 'reject' | 'correction' | 'unrelated' {
    const normalized = message.trim().toLowerCase();

    // Confirm patterns - short affirmative responses
    const confirmPatterns = [
      /^(sim|yes|ok|s|pode|registr[ae]|confirm[ao]|isso|faz|faça)$/i,
      /^pode\s+(sim|fazer|registrar)/i,
      /^(faz|faça)\s+(isso|aí)/i,
    ];
    if (confirmPatterns.some(p => p.test(normalized))) {
      return 'confirm';
    }

    // Reject patterns
    const rejectPatterns = [
      /^(não|no|nao|n|cancela|deixa|esquece|para)$/i,
      /^não\s+(precisa|quero|registra)/i,
    ];
    if (rejectPatterns.some(p => p.test(normalized))) {
      return 'reject';
    }

    // Correction patterns (new value or explicit correction)
    const correctionPatterns = [
      /^(na verdade|errei|corrigi|é|era|são)/i,
      /^\d+[.,]?\d*\s*(kg|ml|litros?|horas?|min)/i,
    ];
    if (correctionPatterns.some(p => p.test(normalized))) {
      return 'correction';
    }

    return 'unrelated';
  }

  /**
   * Handle user response to a pending confirmation
   * Returns true if handled (no need for tool loop), false otherwise
   */
  private async handlePendingConfirmationFromMessage(
    userId: string,
    conversationId: string,
    userMessage: string,
    subject: Subject<MessageEvent>
  ): Promise<boolean> {
    const pending = await this.confirmationStateService.getLatest(conversationId);
    if (pending?.userId !== userId) {
      return false;
    }

    const intent = this.detectUserIntent(userMessage);
    this.logger.log(`Detected user intent: ${intent} for pending confirmation ${pending.confirmationId}`);

    switch (intent) {
      case 'confirm':
        return await this.executeConfirmedToolFromMessage(pending, subject);

      case 'reject':
        await this.confirmationStateService.reject(conversationId, pending.confirmationId);
        subject.next({ type: 'response', data: { content: 'Ok, cancelado.' } });
        subject.next({ data: { content: 'Ok, cancelado.', done: true } });

        // Save rejection message
        await this.messageRepository.create(pending.userId, {
          conversationId,
          role: 'assistant',
          content: 'Ok, cancelado.',
          metadata: { rejectedConfirmation: { confirmationId: pending.confirmationId } },
        });

        subject.complete();
        return true;

      case 'correction':
      case 'unrelated':
        // Clear pending and let new tool loop handle
        await this.confirmationStateService.reject(conversationId, pending.confirmationId);
        this.logger.log(`Clearing pending confirmation due to ${intent} intent`);
        return false;
    }
  }

  /**
   * Execute a confirmed tool from message detection and stream response
   */
  private async executeConfirmedToolFromMessage(
    confirmation: StoredConfirmation,
    subject: Subject<MessageEvent>
  ): Promise<boolean> {
    try {
      const { toolCall } = confirmation;

      this.logger.log(
        `Executing confirmed tool ${toolCall.name} from message for conversation ${confirmation.conversationId}`
      );

      // Execute the tool directly
      const result = await this.combinedExecutor.execute(toolCall, {
        userId: confirmation.userId,
        conversationId: confirmation.conversationId,
      });

      // Remove confirmation from Redis
      await this.confirmationStateService.confirm(
        confirmation.conversationId,
        confirmation.confirmationId
      );

      // Emit tool result
      subject.next({
        type: 'tool_result',
        data: { toolName: toolCall.name, result: result.content, success: result.success },
      });

      // Generate response message
      let responseMessage: string;
      if (!result.success) {
        responseMessage = `Ocorreu um erro ao registrar: ${result.error ?? 'Erro desconhecido'}`;
      } else {
        responseMessage = this.generateToolSuccessMessage(toolCall);
      }

      subject.next({ type: 'response', data: { content: responseMessage } });
      subject.next({ data: { content: responseMessage, done: true } });

      // Save assistant message
      await this.messageRepository.create(confirmation.userId, {
        conversationId: confirmation.conversationId,
        role: 'assistant',
        content: responseMessage,
        metadata: {
          toolExecution: {
            toolName: toolCall.name,
            toolCallId: toolCall.id,
            success: result.success,
            error: result.error,
          },
        },
      });

      subject.complete();
      return true;
    } catch (error) {
      this.logger.error(`Error executing confirmed tool: ${String(error)}`);
      subject.next({
        type: 'error',
        data: { message: 'Erro ao executar ação confirmada.' },
      });
      subject.next({ data: { content: 'Erro ao executar ação confirmada.', done: true, error: 'execution_error' } });
      subject.complete();
      return true;
    }
  }

  /**
   * Generate success message for confirmed tool execution
   */
  private generateToolSuccessMessage(toolCall: ToolCall): string {
    if (toolCall.name === 'record_metric') {
      const args = toolCall.arguments;
      const typeLabels: Record<string, string> = {
        weight: 'peso',
        water: 'água',
        sleep: 'sono',
        exercise: 'exercício',
        mood: 'humor',
        energy: 'energia',
      };
      const typeKey = typeof args.type === 'string' ? args.type : '';
      const type = typeLabels[typeKey] ?? typeKey;
      const value = typeof args.value === 'number' || typeof args.value === 'string' ? args.value : '';
      const unit = typeof args.unit === 'string' ? ` ${args.unit}` : '';
      return `Pronto! Registrei seu ${type} de ${String(value)}${unit}.`;
    }
    return 'Pronto! Ação executada com sucesso.';
  }

  // ==========================================================================
  // Confirmation Handling (ADR-015: Low Friction Tracking)
  // ==========================================================================

  /**
   * Handle pending confirmation from tool loop
   *
   * Stores the confirmation state and emits a confirmation request via SSE.
   */
  private async handlePendingConfirmation(
    userId: string,
    conversationId: string,
    pendingConfirmation: PendingConfirmation,
    llmContent: string,
    subject: Subject<MessageEvent>
  ): Promise<void> {
    const { toolCall, toolDefinition, iteration } = pendingConfirmation;

    this.logger.log(
      `Tool ${toolCall.name} requires confirmation for conversation ${conversationId}`
    );

    // Store confirmation state in Redis
    const storedConfirmation = await this.confirmationStateService.store(
      userId,
      conversationId,
      toolCall,
      toolDefinition,
      iteration
    );

    // Build confirmation message with LLM content
    const confirmationMessage = llmContent || storedConfirmation.message;

    // Emit confirmation request via SSE
    subject.next({
      type: 'confirmation_required',
      data: {
        confirmationId: storedConfirmation.confirmationId,
        toolName: toolCall.name,
        toolArgs: toolCall.arguments,
        message: confirmationMessage,
        expiresAt: storedConfirmation.expiresAt,
      },
    });

    // Save assistant message asking for confirmation
    await this.messageRepository.create(userId, {
      conversationId,
      role: 'assistant',
      content: confirmationMessage,
      metadata: {
        pendingConfirmation: {
          confirmationId: storedConfirmation.confirmationId,
          toolName: toolCall.name,
          toolArgs: toolCall.arguments,
        },
      },
    });

    subject.next({
      data: { content: confirmationMessage, done: true, awaitingConfirmation: true },
    });

    subject.complete();
  }

  /**
   * Get pending confirmation for a conversation
   */
  async getPendingConfirmation(
    conversationId: string
  ): Promise<StoredConfirmation | null> {
    return this.confirmationStateService.getLatest(conversationId);
  }

  /**
   * Confirm a pending tool execution
   *
   * Executes the tool and continues the conversation.
   */
  async confirmToolExecution(
    userId: string,
    conversationId: string,
    confirmationId: string
  ): Promise<Observable<MessageEvent>> {
    const subject = new Subject<MessageEvent>();

    // Get and remove confirmation from Redis
    const confirmation = await this.confirmationStateService.confirm(
      conversationId,
      confirmationId
    );

    if (!confirmation) {
      subject.next({
        data: {
          content: 'A confirmação expirou ou não foi encontrada. Por favor, tente novamente.',
          done: true,
          error: 'confirmation_expired',
        },
      });
      subject.complete();
      return subject.asObservable();
    }

    // Process confirmed tool execution
    this.processConfirmedToolExecution(userId, conversationId, confirmation, subject).catch(
      (error: unknown) => {
        this.logger.error('Confirmed tool execution error:', error);
        subject.next({
          data: {
            content: 'Erro ao executar a ação. Por favor, tente novamente.',
            done: true,
            error: 'execution_error',
          },
        });
        subject.complete();
      }
    );

    return subject.asObservable();
  }

  /**
   * Reject a pending tool execution
   *
   * Cancels the tool and responds to the user.
   */
  async rejectToolExecution(
    userId: string,
    conversationId: string,
    confirmationId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const rejected = await this.confirmationStateService.reject(
      conversationId,
      confirmationId
    );

    if (!rejected) {
      return {
        success: false,
        message: 'A confirmação expirou ou não foi encontrada.',
      };
    }

    // Save rejection message
    const rejectionMessage = reason
      ? `Entendi, não vou registrar. ${reason}`
      : 'Tudo bem, não vou registrar essa informação.';

    await this.messageRepository.create(userId, {
      conversationId,
      role: 'assistant',
      content: rejectionMessage,
      metadata: {
        rejectedConfirmation: {
          confirmationId,
          reason,
        },
      },
    });

    return {
      success: true,
      message: rejectionMessage,
    };
  }

  /**
   * Process a confirmed tool execution
   */
  private async processConfirmedToolExecution(
    userId: string,
    conversationId: string,
    confirmation: StoredConfirmation,
    subject: Subject<MessageEvent>
  ): Promise<void> {
    const { toolCall } = confirmation;

    this.logger.log(
      `Executing confirmed tool ${toolCall.name} for conversation ${conversationId}`
    );

    // Execute the tool directly
    const result = await this.combinedExecutor.execute(toolCall, {
      userId,
      conversationId,
    });

    if (!result.success) {
      subject.next({
        data: {
          content: `Ocorreu um erro ao registrar: ${result.error ?? 'Erro desconhecido'}`,
          done: true,
          error: result.error,
        },
      });

      await this.messageRepository.create(userId, {
        conversationId,
        role: 'assistant',
        content: `Ocorreu um erro ao registrar: ${result.error ?? 'Erro desconhecido'}`,
        metadata: {
          toolExecution: {
            toolName: toolCall.name,
            success: false,
            error: result.error,
          },
        },
      });

      subject.complete();
      return;
    }

    // Parse result content for a nice message
    let successMessage: string;
    try {
      const resultData = JSON.parse(result.content) as { message?: string };
      successMessage = resultData.message ?? 'Registrado com sucesso!';
    } catch {
      successMessage = 'Registrado com sucesso!';
    }

    // Emit success
    subject.next({
      data: {
        content: successMessage,
        done: true,
        toolResult: {
          toolName: toolCall.name,
          success: true,
        },
      },
    });

    // Save success message
    await this.messageRepository.create(userId, {
      conversationId,
      role: 'assistant',
      content: successMessage,
      metadata: {
        toolExecution: {
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          success: true,
          result: result.content,
        },
      },
    });

    subject.complete();
  }
}
