import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../../../config/config.service';
import type { ToolCall, ToolDefinition } from '@life-assistant/ai';

/**
 * Stored confirmation state in Redis
 * Supports multiple parallel tool calls that need confirmation together.
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export interface StoredConfirmation {
  /** Unique confirmation ID */
  confirmationId: string;
  /** Conversation ID */
  conversationId: string;
  /** User ID */
  userId: string;
  /** Tool call that needs confirmation (first one, for backwards compatibility) */
  toolCall: ToolCall;
  /** All tool calls that need confirmation (for parallel calls) */
  toolCalls: ToolCall[];
  /** Tool definition name (for reference) */
  toolName: string;
  /** All tool names (for parallel calls) */
  toolNames: string[];
  /** Human-readable message for user */
  message: string;
  /** Current iteration in tool loop */
  iteration: number;
  /** Timestamp when created */
  createdAt: string;
  /** Timestamp when expires */
  expiresAt: string;
}

/**
 * Result of confirmation lookup
 */
export interface ConfirmationResult {
  found: boolean;
  confirmation?: StoredConfirmation;
}

/**
 * TTL for pending confirmations (5 minutes)
 */
const CONFIRMATION_TTL_SECONDS = 5 * 60;

/**
 * Redis key prefix for confirmations
 */
const REDIS_KEY_PREFIX = 'chat:confirmation:';

/**
 * ConfirmationStateService - Manages pending tool confirmations in Redis
 *
 * Stores pending confirmation state with TTL for tools that require
 * user confirmation before execution (e.g., record_metric).
 *
 * @see ADR-015 for Low Friction Tracking Philosophy
 * @see docs/specs/ai.md §6.2 for tool confirmation flow
 */
@Injectable()
export class ConfirmationStateService implements OnModuleDestroy {
  private readonly logger = new Logger(ConfirmationStateService.name);
  private readonly redis: Redis;

  constructor(private readonly configService: AppConfigService) {
    this.redis = new Redis(this.configService.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for confirmation state');
    });
  }

  /**
   * Clean up Redis connection on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Generate a unique confirmation ID
   */
  private generateConfirmationId(): string {
    return `conf_${String(Date.now())}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get Redis key for a confirmation
   */
  private getKey(conversationId: string, confirmationId?: string): string {
    if (confirmationId) {
      return `${REDIS_KEY_PREFIX}${conversationId}:${confirmationId}`;
    }
    return `${REDIS_KEY_PREFIX}${conversationId}:*`;
  }

  /**
   * Store a pending confirmation
   *
   * Supports both single and multiple tool calls (for parallel execution).
   *
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param toolCall - Tool call requiring confirmation (or first of multiple)
   * @param toolDefinition - Tool definition
   * @param iteration - Current tool loop iteration
   * @param additionalToolCalls - Additional tool calls for parallel execution
   * @param additionalToolDefinitions - Additional tool definitions
   * @param customMessage - Optional custom message (e.g., from LLM) to use instead of generated one
   * @returns Stored confirmation with generated ID
   */
  async store(
    userId: string,
    conversationId: string,
    toolCall: ToolCall,
    toolDefinition: ToolDefinition,
    iteration: number,
    additionalToolCalls?: ToolCall[],
    additionalToolDefinitions?: ToolDefinition[],
    customMessage?: string
  ): Promise<StoredConfirmation> {
    const confirmationId = this.generateConfirmationId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONFIRMATION_TTL_SECONDS * 1000);

    // Combine all tool calls (first + additional)
    const allToolCalls = additionalToolCalls
      ? [toolCall, ...additionalToolCalls.filter(tc => tc.id !== toolCall.id)]
      : [toolCall];
    const allToolNames = allToolCalls.map(tc => tc.name);

    // Use custom message (from LLM) if provided, otherwise generate system message
    // This prevents double confirmation when LLM already asked naturally
    const message = customMessage ?? this.generateConfirmationMessageForAll(
      allToolCalls,
      additionalToolDefinitions
        ? [toolDefinition, ...additionalToolDefinitions.filter(td => td.name !== toolDefinition.name)]
        : [toolDefinition]
    );

    const confirmation: StoredConfirmation = {
      confirmationId,
      conversationId,
      userId,
      toolCall,
      toolCalls: allToolCalls,
      toolName: toolCall.name,
      toolNames: allToolNames,
      message,
      iteration,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const key = this.getKey(conversationId, confirmationId);

    await this.redis.setex(
      key,
      CONFIRMATION_TTL_SECONDS,
      JSON.stringify(confirmation)
    );

    this.logger.log(
      `Stored confirmation ${confirmationId} for ${String(allToolCalls.length)} tool(s): ${allToolNames.join(', ')} in conversation ${conversationId}`,
      { confirmationId, toolNames: allToolNames, conversationId }
    );

    return confirmation;
  }

  /**
   * Get a pending confirmation by ID
   *
   * @param conversationId - Conversation ID
   * @param confirmationId - Confirmation ID
   * @returns Confirmation result
   */
  async get(
    conversationId: string,
    confirmationId: string
  ): Promise<ConfirmationResult> {
    const key = this.getKey(conversationId, confirmationId);
    const data = await this.redis.get(key);

    if (!data) {
      return { found: false };
    }

    try {
      const confirmation = JSON.parse(data) as StoredConfirmation;
      return { found: true, confirmation };
    } catch {
      this.logger.warn(`Failed to parse confirmation data for ${key}`);
      return { found: false };
    }
  }

  /**
   * Get the latest pending confirmation for a conversation
   *
   * @param conversationId - Conversation ID
   * @returns Latest confirmation or null
   */
  async getLatest(conversationId: string): Promise<StoredConfirmation | null> {
    const pattern = this.getKey(conversationId);
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return null;
    }

    // Get all confirmations and find the latest
    const confirmations: StoredConfirmation[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          confirmations.push(JSON.parse(data) as StoredConfirmation);
        } catch {
          // Skip invalid data
        }
      }
    }

    if (confirmations.length === 0) {
      return null;
    }

    // Sort by createdAt descending and return latest
    confirmations.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return confirmations[0] ?? null;
  }

  /**
   * Confirm a pending tool execution
   *
   * Removes the confirmation from Redis and returns it for execution.
   *
   * @param conversationId - Conversation ID
   * @param confirmationId - Confirmation ID
   * @returns Confirmed confirmation or null if not found/expired
   */
  async confirm(
    conversationId: string,
    confirmationId: string
  ): Promise<StoredConfirmation | null> {
    const result = await this.get(conversationId, confirmationId);

    if (!result.found || !result.confirmation) {
      this.logger.warn(
        `Confirmation ${confirmationId} not found or expired for conversation ${conversationId}`
      );
      return null;
    }

    // Delete the confirmation
    const key = this.getKey(conversationId, confirmationId);
    await this.redis.del(key);

    this.logger.log(
      `Confirmed and removed confirmation ${confirmationId} for tool ${result.confirmation.toolName}`
    );

    return result.confirmation;
  }

  /**
   * Reject a pending tool execution
   *
   * Removes the confirmation from Redis without executing.
   *
   * @param conversationId - Conversation ID
   * @param confirmationId - Confirmation ID
   * @returns True if found and rejected, false if not found
   */
  async reject(
    conversationId: string,
    confirmationId: string
  ): Promise<boolean> {
    const result = await this.get(conversationId, confirmationId);

    if (!result.found) {
      return false;
    }

    const key = this.getKey(conversationId, confirmationId);
    await this.redis.del(key);

    this.logger.log(
      `Rejected and removed confirmation ${confirmationId} for conversation ${conversationId}`
    );

    return true;
  }

  /**
   * Clear all pending confirmations for a conversation
   *
   * @param conversationId - Conversation ID
   */
  async clearAll(conversationId: string): Promise<void> {
    const pattern = this.getKey(conversationId);
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(
        `Cleared ${String(keys.length)} confirmations for conversation ${conversationId}`
      );
    }
  }

  /**
   * Generate a human-readable confirmation message for a single tool call
   */
  private generateConfirmationMessage(
    toolCall: ToolCall,
    _toolDefinition: ToolDefinition
  ): string {
    const args = toolCall.arguments;

    switch (toolCall.name) {
      case 'record_metric': {
        const type = args.type as string;
        const value = args.value as number;
        const unit = args.unit as string | undefined;
        const date = args.date as string;

        // Portuguese labels for types
        const typeLabels: Record<string, string> = {
          weight: 'peso',
          water: 'água',
          sleep: 'sono',
          exercise: 'exercício',
          mood: 'humor',
          energy: 'energia',
          expense: 'gasto',
          income: 'receita',
          investment: 'investimento',
          custom: 'métrica personalizada',
        };

        const unitLabels: Record<string, string> = {
          kg: 'kg',
          ml: 'ml',
          hours: 'horas',
          min: 'minutos',
          score: 'pontos',
        };

        const typeLabel = typeLabels[type] ?? type;
        const unitLabel = unit ? unitLabels[unit] ?? unit : '';

        return `Registrar ${typeLabel}: ${String(value)} ${unitLabel} em ${date}?`;
      }

      case 'add_knowledge': {
        const content = args.content as string;
        const preview =
          content.length > 50 ? content.substring(0, 47) + '...' : content;
        return `Salvar conhecimento: "${preview}"?`;
      }

      case 'update_metric': {
        const value = args.value as number;
        const unit = args.unit as string | undefined;

        const unitLabels: Record<string, string> = {
          kg: 'kg',
          ml: 'ml',
          hours: 'horas',
          min: 'minutos',
          score: 'pontos',
        };

        const unitLabel = unit ? unitLabels[unit] ?? unit : '';

        return `Corrigir para ${String(value)} ${unitLabel}?`.trim();
      }

      case 'delete_metric': {
        return 'Remover este registro?';
      }

      case 'delete_metrics': {
        const entryIds = args.entryIds as string[];
        const count = entryIds.length;
        return `Remover ${String(count)} registros?`;
      }

      default:
        return `Executar ${toolCall.name}?`;
    }
  }

  /**
   * Generate a human-readable confirmation message for multiple tool calls.
   *
   * When multiple parallel delete_metric calls are received, aggregates them
   * into a single "Remover X registros?" message.
   *
   * @see ADR-015 Low Friction Tracking Philosophy
   */
  private generateConfirmationMessageForAll(
    toolCalls: ToolCall[],
    toolDefinitions: ToolDefinition[]
  ): string {
    // Single tool call - use the standard message generator
    const firstToolCall = toolCalls.at(0);
    const firstToolDef = toolDefinitions.at(0);
    if (toolCalls.length === 1 && firstToolCall && firstToolDef) {
      return this.generateConfirmationMessage(firstToolCall, firstToolDef);
    }

    // Multiple tool calls - check if they're all the same type
    const toolNames = new Set(toolCalls.map(tc => tc.name));

    // All delete_metric calls - aggregate into a count message
    if (toolNames.size === 1 && toolNames.has('delete_metric')) {
      return `Remover ${String(toolCalls.length)} registros?`;
    }

    // All record_metric calls - list them
    if (toolNames.size === 1 && toolNames.has('record_metric')) {
      const summaries = toolCalls.map(tc => {
        const args = tc.arguments;
        const type = args.type as string;
        const value = args.value as number;
        const unit = args.unit as string | undefined;

        const typeLabels: Record<string, string> = {
          weight: 'peso',
          water: 'água',
          sleep: 'sono',
          exercise: 'exercício',
          mood: 'humor',
          energy: 'energia',
        };

        const typeLabel = typeLabels[type] ?? type;
        return `${typeLabel}: ${String(value)}${unit ? ` ${unit}` : ''}`;
      });

      return `Registrar ${summaries.join(', ')}?`;
    }

    // Mixed tool calls - generic message
    const toolNameLabels: Record<string, string> = {
      delete_metric: 'deletar registro',
      record_metric: 'registrar métrica',
      update_metric: 'atualizar registro',
      add_knowledge: 'salvar conhecimento',
    };

    const actions = toolCalls.map(tc => toolNameLabels[tc.name] ?? tc.name);
    return `Executar ${String(toolCalls.length)} ações: ${actions.join(', ')}?`;
  }
}
