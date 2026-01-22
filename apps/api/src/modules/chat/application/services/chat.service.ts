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
  updateMetricTool,
  deleteMetricTool,
  respondToConfirmationTool,
  // Finance tools (M2.2)
  getFinanceSummaryTool,
  getPendingBillsTool,
  markBillPaidTool,
  createExpenseTool,
  getDebtProgressTool,
  type LLMPort,
  type Message as LLMMessage,
  type ToolLoopConfig,
  type ToolDefinition,
  type ToolExecutor,
  type ToolCall,
  type ToolExecutionContext,
  type ToolExecutionResult,
  type PendingConfirmation,
  type RespondToConfirmationParams,
  createErrorResult,
} from '@life-assistant/ai';
import type { Conversation, Message } from '@life-assistant/database';
import { ContextBuilderService } from './context-builder.service';
import { ConfirmationStateService, type StoredConfirmation } from './confirmation-state.service';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import { MemoryToolExecutorService } from '../../../memory/application/services/memory-tool-executor.service';
import { TrackingToolExecutorService } from '../../../tracking/application/services/tracking-tool-executor.service';
import { FinanceToolExecutorService } from '../../../finance/application/services/finance-tool-executor.service';
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
 * Result of LLM-based intent detection
 */
interface IntentDetectionResult {
  intent: 'confirm' | 'reject' | 'correction' | 'unrelated' | 'error';
  correctedValue?: number | undefined;
  correctedUnit?: string | undefined;
  confidence: number;
  errorMessage?: string | undefined;
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
   *
   * Note: delete_metrics (batch) was removed - LLM hallucinates entry IDs.
   * Parallel delete_metric calls work correctly and are confirmed together.
   */
  private readonly availableTools: ToolDefinition[] = [
    // Memory tools
    searchKnowledgeTool,
    addKnowledgeTool,
    analyzeContextTool,
    // Tracking tools (M2.1)
    recordMetricTool,
    getTrackingHistoryTool,
    updateMetricTool,
    deleteMetricTool,
    // Finance tools (M2.2)
    getFinanceSummaryTool,
    getPendingBillsTool,
    markBillPaidTool,
    createExpenseTool,
    getDebtProgressTool,
  ];

  /**
   * Tool name to executor mapping
   */
  private readonly toolToExecutorMap: Record<string, 'memory' | 'tracking' | 'finance'> = {
    search_knowledge: 'memory',
    add_knowledge: 'memory',
    analyze_context: 'memory',
    record_metric: 'tracking',
    get_tracking_history: 'tracking',
    update_metric: 'tracking',
    delete_metric: 'tracking',
    // Finance tools (M2.2)
    get_finance_summary: 'finance',
    get_pending_bills: 'finance',
    mark_bill_paid: 'finance',
    create_expense: 'finance',
    get_debt_progress: 'finance',
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
    private readonly trackingToolExecutor: TrackingToolExecutorService,
    private readonly financeToolExecutor: FinanceToolExecutorService
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
          case 'finance':
            return this.financeToolExecutor.execute(toolCall, context);
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
          lastUserMessage,
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
   * Detect user intent via LLM with forced tool execution.
   * Uses toolChoice: { type: 'tool', toolName: 'respond_to_confirmation' }
   * to guarantee deterministic execution.
   *
   * NO FALLBACK TO REGEX: If LLM fails, returns explicit error.
   * Regex-based detection is proven flawed for natural language variations.
   *
   * @see ADR-015 Low Friction Tracking Philosophy
   */
  private async detectUserIntentViaLLM(
    userMessage: string,
    pendingConfirmation: StoredConfirmation
  ): Promise<IntentDetectionResult> {
    const systemPrompt = `You are analyzing a user's response to a confirmation prompt.

The pending confirmation is: "${pendingConfirmation.message}"
Tool: ${pendingConfirmation.toolName}
Arguments: ${JSON.stringify(pendingConfirmation.toolCall.arguments)}

The user responded with: "${userMessage}"

Analyze the user's message and determine their intent using the respond_to_confirmation tool.`;

    try {
      const response = await this.llm.chatWithTools({
        messages: [{ role: 'user', content: userMessage }],
        systemPrompt,
        tools: [respondToConfirmationTool],
        toolChoice: { type: 'tool', toolName: 'respond_to_confirmation' },
        temperature: 0, // Maximum determinism
      });

      const toolCall = response.toolCalls?.[0];
      if (toolCall) {
        const args = toolCall.arguments as RespondToConfirmationParams;

        // Map 'correct' to 'correction' for backwards compatibility
        const intent: 'confirm' | 'reject' | 'correction' =
          args.intent === 'correct' ? 'correction' : args.intent;

        this.logger.log(`LLM detected intent: ${intent} with confidence ${String(args.confidence)}`);

        return {
          intent,
          confidence: args.confidence,
          ...(args.correctedValue !== undefined && { correctedValue: args.correctedValue }),
          ...(args.correctedUnit !== undefined && { correctedUnit: args.correctedUnit }),
        };
      }

      // No tool call returned (shouldn't happen with forced tool_choice)
      this.logger.warn('No tool call returned despite forced tool_choice');
      return {
        intent: 'error',
        confidence: 0,
        errorMessage: 'Não consegui processar sua resposta. Pode tentar novamente?',
      };

    } catch (error) {
      this.logger.error('Error detecting user intent via LLM', { error });
      // NO FALLBACK TO REGEX - Return explicit error
      // Regex is proven flawed for natural language (misses "beleza", "manda ver", etc.)
      // Better to fail explicitly than fail silently
      return {
        intent: 'error',
        confidence: 0,
        errorMessage: 'Desculpe, tive um problema ao processar. Pode tentar novamente?',
      };
    }
  }

  /**
   * Check if user message is a confirmation for update/delete operations
   * Used to avoid double confirmation when AI already asked nicely
   */
  private isUpdateDeleteConfirmation(message: string): boolean {
    const normalized = message.trim().toLowerCase();

    // Patterns that indicate user is confirming an update/delete operation
    const updateDeleteConfirmPatterns = [
      // Generic confirmations
      /^(sim|yes|ok|s|pode|isso|faz|faça)$/i,
      /^pode\s+(sim|fazer)/i,
      /^(faz|faça)\s+(isso|aí)/i,
      /^sim[,.]?\s+(pode|faz|faça)/i,

      // Update-specific confirmations
      /^pode\s+(atualizar|corrigir|alterar|mudar)/i,
      /^(atualiza|corrige|altera|muda)/i,
      /^sim[,.]?\s*(atualiza|corrige)/i,

      // Delete-specific confirmations
      /^pode\s+(deletar|remover|apagar|excluir)/i,
      /^(deleta|remove|apaga|exclui|exclua)/i,
      /^sim[,.]?\s*(deleta|remove|apaga|exclua)/i,

      // Implicit confirmations (user asking to do it)
      /^(atualize|corrija|delete|remova|apague|exclua)/i,
      /atualiz[ae]\s+(pra|para)\s+mim/i,
      /corrig[ae]\s+(pra|para)\s+mim/i,
    ];

    return updateDeleteConfirmPatterns.some(p => p.test(normalized));
  }

  /**
   * Handle user response to a pending confirmation
   * Returns true if handled (no need for tool loop), false otherwise
   *
   * Uses LLM-based intent detection for natural language understanding.
   * @see ADR-015 Low Friction Tracking Philosophy
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

    // Use LLM for intent detection instead of regex
    const { intent, correctedValue, correctedUnit, confidence, errorMessage } =
      await this.detectUserIntentViaLLM(userMessage, pending);

    // Log for monitoring
    this.logger.log('User intent detected via LLM', {
      conversationId,
      confirmationId: pending.confirmationId,
      intent,
      confidence,
      correctedValue,
      correctedUnit,
    });

    switch (intent) {
      case 'confirm':
        return await this.executeConfirmedToolFromMessage(pending, subject);

      case 'reject':
        await this.confirmationStateService.reject(conversationId, pending.confirmationId);
        // Send content once, then signal done (no duplicate)
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
        // Handle correction with new value
        if (correctedValue !== undefined) {
          const correctedToolCall: ToolCall = {
            ...pending.toolCall,
            arguments: {
              ...pending.toolCall.arguments,
              value: correctedValue,
              ...(correctedUnit && { unit: correctedUnit }),
            },
          };

          // Create a new stored confirmation with corrected values
          // Must also update toolCalls array since that's what executeConfirmedToolFromMessage uses
          const correctedConfirmation: StoredConfirmation = {
            ...pending,
            toolCall: correctedToolCall,
            toolCalls: [correctedToolCall], // Update the toolCalls array with corrected value
          };

          return await this.executeConfirmedToolFromMessage(correctedConfirmation, subject);
        }
        // No value extracted, ask for clarification (send content once, no duplicate)
        subject.next({ data: { content: 'Qual seria o valor correto?', done: true } });
        subject.complete();
        return true;

      case 'error': {
        // LLM failed to process - return error message but KEEP confirmation pending
        // User can try again with same or different response (send content once, no duplicate)
        const message = errorMessage ?? 'Desculpe, tive um problema ao processar. Pode tentar novamente?';
        subject.next({ data: { content: message, done: true } });
        subject.complete();
        return true;
      }

      case 'unrelated':
      default:
        // Message is not about the confirmation
        // Clear the pending confirmation and proceed with normal flow
        await this.confirmationStateService.clearAll(conversationId);
        return false;
    }
  }

  /**
   * Execute confirmed tools from message detection and stream response.
   * Supports multiple parallel tool calls that were confirmed together.
   */
  private async executeConfirmedToolFromMessage(
    confirmation: StoredConfirmation,
    subject: Subject<MessageEvent>
  ): Promise<boolean> {
    try {
      // Get all tool calls (toolCalls is always present in the updated interface)
      const allToolCalls = confirmation.toolCalls;

      this.logger.log(
        `Executing ${String(allToolCalls.length)} confirmed tool(s) from message for conversation ${confirmation.conversationId}`
      );

      // Execute ALL tool calls
      const results: ToolExecutionResult[] = [];
      let hasError = false;
      let errorMessage = '';

      for (const toolCall of allToolCalls) {
        const result = await this.combinedExecutor.execute(toolCall, {
          userId: confirmation.userId,
          conversationId: confirmation.conversationId,
        });

        results.push(result);

        // Emit tool result for each
        subject.next({
          type: 'tool_result',
          data: { toolName: toolCall.name, result: result.content, success: result.success },
        });

        if (!result.success) {
          hasError = true;
          errorMessage = result.error ?? 'Erro desconhecido';
          break; // Stop on first error
        }
      }

      // Remove confirmation from Redis
      await this.confirmationStateService.confirm(
        confirmation.conversationId,
        confirmation.confirmationId
      );

      // Generate response message
      let responseMessage: string;
      if (hasError) {
        responseMessage = `Ocorreu um erro: ${errorMessage}`;
      } else if (allToolCalls.length === 1 && allToolCalls[0]) {
        responseMessage = this.generateToolSuccessMessage(allToolCalls[0]);
      } else {
        // Multiple tools executed
        responseMessage = this.generateMultiToolSuccessMessage(allToolCalls);
      }

      // Send content once (no duplicate)
      subject.next({ data: { content: responseMessage, done: true } });

      // Save assistant message
      await this.messageRepository.create(confirmation.userId, {
        conversationId: confirmation.conversationId,
        role: 'assistant',
        content: responseMessage,
        metadata: {
          toolExecution: {
            toolNames: allToolCalls.map(tc => tc.name),
            toolCallIds: allToolCalls.map(tc => tc.id),
            success: !hasError,
            error: hasError ? errorMessage : undefined,
            count: allToolCalls.length,
          },
        },
      });

      subject.complete();
      return true;
    } catch (error) {
      this.logger.error(`Error executing confirmed tool: ${String(error)}`);
      // Send error once (no duplicate)
      subject.next({ data: { content: 'Erro ao executar ação confirmada.', done: true, error: 'execution_error' } });
      subject.complete();
      return true;
    }
  }

  /**
   * Generate success message for confirmed tool execution
   */
  private generateToolSuccessMessage(toolCall: ToolCall): string {
    const args = toolCall.arguments;
    const typeLabels: Record<string, string> = {
      weight: 'peso',
      water: 'água',
      sleep: 'sono',
      exercise: 'exercício',
      mood: 'humor',
      energy: 'energia',
    };

    if (toolCall.name === 'record_metric') {
      const typeKey = typeof args.type === 'string' ? args.type : '';
      const type = typeLabels[typeKey] ?? typeKey;
      const value =
        typeof args.value === 'number' || typeof args.value === 'string' ? args.value : '';
      const unit = typeof args.unit === 'string' ? ` ${args.unit}` : '';
      return `Pronto! Registrei seu ${type} de ${String(value)}${unit}.`;
    }

    if (toolCall.name === 'update_metric') {
      const value =
        typeof args.value === 'number' || typeof args.value === 'string' ? args.value : '';
      const unit = typeof args.unit === 'string' ? ` ${args.unit}` : '';
      return `Pronto! Registro corrigido para ${String(value)}${unit}.`;
    }

    if (toolCall.name === 'delete_metric') {
      return `Pronto! Registro removido.`;
    }

    return 'Pronto! Ação executada com sucesso.';
  }

  /**
   * Generate success message for multiple confirmed tool executions
   */
  private generateMultiToolSuccessMessage(toolCalls: ToolCall[]): string {
    const toolNames = new Set(toolCalls.map(tc => tc.name));

    // All delete_metric calls
    if (toolNames.size === 1 && toolNames.has('delete_metric')) {
      return `Pronto! ${String(toolCalls.length)} registros removidos.`;
    }

    // All record_metric calls
    if (toolNames.size === 1 && toolNames.has('record_metric')) {
      return `Pronto! ${String(toolCalls.length)} métricas registradas.`;
    }

    // Mixed or other tools
    return `Pronto! ${String(toolCalls.length)} ações executadas com sucesso.`;
  }
  // ==========================================================================
  // Confirmation Handling (ADR-015: Low Friction Tracking)
  // ==========================================================================

  /**
   * Handle pending confirmation from tool loop
   *
   * Stores the confirmation state and emits a confirmation request via SSE.
   * Supports multiple parallel tool calls that all need confirmation.
   */
  private async handlePendingConfirmation(
    userId: string,
    conversationId: string,
    pendingConfirmation: PendingConfirmation,
    llmContent: string,
    userMessage: string,
    subject: Subject<MessageEvent>
  ): Promise<void> {
    // Get all tool calls that need confirmation
    // toolCalls/toolDefinitions are always present in the updated interface
    const allToolCalls = pendingConfirmation.toolCalls;
    const allToolDefinitions = pendingConfirmation.toolDefinitions;
    const { iteration } = pendingConfirmation;

    this.logger.log(
      `${String(allToolCalls.length)} tool(s) require confirmation for conversation ${conversationId}: ${allToolCalls.map(tc => tc.name).join(', ')}`
    );

    // For update_metric and delete_metric, check if user message is already a confirmation
    // This avoids double confirmation when AI already asked nicely
    const allConfirmable = allToolCalls.every(tc =>
      tc.name === 'update_metric' || tc.name === 'delete_metric'
    );

    if (allConfirmable && this.isUpdateDeleteConfirmation(userMessage)) {
      this.logger.log(
        `User message "${userMessage}" is already a confirmation for ${String(allToolCalls.length)} tools, executing directly`
      );

      // Execute ALL tool calls directly without asking again
      const results: ToolExecutionResult[] = [];
      for (const toolCall of allToolCalls) {
        const result = await this.combinedExecutor.execute(toolCall, {
          userId,
          conversationId,
        });
        results.push(result);

        if (!result.success) {
          subject.next({
            data: {
              content: `Ocorreu um erro em ${toolCall.name}: ${result.error ?? 'Erro desconhecido'}`,
              done: true,
              error: result.error,
            },
          });

          await this.messageRepository.create(userId, {
            conversationId,
            role: 'assistant',
            content: `Ocorreu um erro: ${result.error ?? 'Erro desconhecido'}`,
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

        // Emit progress for each completed operation
        subject.next({
          type: 'tool_result',
          data: {
            toolName: toolCall.name,
            success: true,
          },
        });
      }

      this.logger.log(
        `Auto-confirmed and executed ${String(allToolCalls.length)} tools successfully`
      );

      // Generate response directly - do NOT run tool loop again
      // Running tool loop again causes LLM to try re-deleting already-deleted entries,
      // which fails with "Registro não encontrado" (lines 1091-1120)
      const responseMessage = this.generateMultiToolSuccessMessage(allToolCalls);

      subject.next({ data: { content: responseMessage, done: true } });

      await this.messageRepository.create(userId, {
        conversationId,
        role: 'assistant',
        content: responseMessage,
        metadata: {
          toolExecution: {
            toolNames: allToolCalls.map(tc => tc.name),
            toolCallIds: allToolCalls.map(tc => tc.id),
            success: true,
            count: allToolCalls.length,
          },
        },
      });

      subject.complete();
      return;
    }

    // Store confirmation state in Redis (with all tool calls)
    // We know allToolCalls.length > 0 if we got here since pendingConfirmation exists
    const firstToolCall = allToolCalls.at(0);
    const firstToolDefinition = allToolDefinitions.at(0);
    if (!firstToolCall || !firstToolDefinition) {
      this.logger.error('No tool calls in pendingConfirmation - this should not happen');
      return;
    }

    // Use LLM content as the confirmation message if available
    // This prevents double confirmation: LLM asking naturally + system message
    const confirmationMessage = llmContent || undefined;

    const storedConfirmation = await this.confirmationStateService.store(
      userId,
      conversationId,
      firstToolCall,
      firstToolDefinition,
      iteration,
      allToolCalls.length > 1 ? allToolCalls.slice(1) : undefined,
      allToolDefinitions.length > 1 ? allToolDefinitions.slice(1) : undefined,
      confirmationMessage // Pass LLM content so stored message matches what user sees
    );

    // Use the stored message (which is now either LLM content or generated)
    const finalConfirmationMessage = storedConfirmation.message;

    // Emit confirmation request via SSE
    subject.next({
      type: 'confirmation_required',
      data: {
        confirmationId: storedConfirmation.confirmationId,
        toolName: firstToolCall.name,
        toolArgs: firstToolCall.arguments,
        message: finalConfirmationMessage,
        expiresAt: storedConfirmation.expiresAt,
      },
    });

    // Save assistant message asking for confirmation
    await this.messageRepository.create(userId, {
      conversationId,
      role: 'assistant',
      content: finalConfirmationMessage,
      metadata: {
        pendingConfirmation: {
          confirmationId: storedConfirmation.confirmationId,
          toolName: firstToolCall.name,
          toolArgs: firstToolCall.arguments,
        },
      },
    });

    // Signal done WITHOUT repeating content (already sent in confirmation_required event)
    // This prevents duplicate confirmation messages in the frontend
    subject.next({
      data: { done: true, awaitingConfirmation: true },
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
   * Process a confirmed tool execution.
   * Supports multiple parallel tool calls that were confirmed together.
   */
  private async processConfirmedToolExecution(
    userId: string,
    conversationId: string,
    confirmation: StoredConfirmation,
    subject: Subject<MessageEvent>
  ): Promise<void> {
    // Get all tool calls (toolCalls is always present in the updated interface)
    const allToolCalls = confirmation.toolCalls;

    this.logger.log(
      `Executing ${String(allToolCalls.length)} confirmed tool(s) for conversation ${conversationId}`
    );

    // Execute ALL tool calls
    const results: ToolExecutionResult[] = [];
    let hasError = false;
    let errorMessage = '';

    for (const toolCall of allToolCalls) {
      const result = await this.combinedExecutor.execute(toolCall, {
        userId,
        conversationId,
      });

      results.push(result);

      if (!result.success) {
        hasError = true;
        errorMessage = result.error ?? 'Erro desconhecido';
        break; // Stop on first error
      }
    }

    if (hasError) {
      subject.next({
        data: {
          content: `Ocorreu um erro: ${errorMessage}`,
          done: true,
          error: errorMessage,
        },
      });

      await this.messageRepository.create(userId, {
        conversationId,
        role: 'assistant',
        content: `Ocorreu um erro: ${errorMessage}`,
        metadata: {
          toolExecution: {
            toolNames: allToolCalls.map(tc => tc.name),
            success: false,
            error: errorMessage,
          },
        },
      });

      subject.complete();
      return;
    }

    // Generate success message
    let successMessage: string;
    const firstResult = results[0];
    if (allToolCalls.length === 1 && firstResult) {
      // Try to parse result for single tool
      try {
        const resultData = JSON.parse(firstResult.content) as { message?: string };
        successMessage = resultData.message ?? 'Registrado com sucesso!';
      } catch {
        successMessage = 'Registrado com sucesso!';
      }
    } else {
      // Multiple tools
      successMessage = this.generateMultiToolSuccessMessage(allToolCalls);
    }

    // Emit success
    subject.next({
      data: {
        content: successMessage,
        done: true,
        toolResult: {
          toolNames: allToolCalls.map(tc => tc.name),
          success: true,
          count: allToolCalls.length,
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
          toolNames: allToolCalls.map(tc => tc.name),
          toolCallIds: allToolCalls.map(tc => tc.id),
          success: true,
          count: allToolCalls.length,
        },
      },
    });

    subject.complete();
  }
}
