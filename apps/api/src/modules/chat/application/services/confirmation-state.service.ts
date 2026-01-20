import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../../../config/config.service';
import type { ToolCall, ToolDefinition } from '@life-assistant/ai';

/**
 * Stored confirmation state in Redis
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export interface StoredConfirmation {
  /** Unique confirmation ID */
  confirmationId: string;
  /** Conversation ID */
  conversationId: string;
  /** User ID */
  userId: string;
  /** Tool call that needs confirmation */
  toolCall: ToolCall;
  /** Tool definition name (for reference) */
  toolName: string;
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
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param toolCall - Tool call requiring confirmation
   * @param toolDefinition - Tool definition
   * @param iteration - Current tool loop iteration
   * @returns Stored confirmation with generated ID
   */
  async store(
    userId: string,
    conversationId: string,
    toolCall: ToolCall,
    toolDefinition: ToolDefinition,
    iteration: number
  ): Promise<StoredConfirmation> {
    const confirmationId = this.generateConfirmationId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONFIRMATION_TTL_SECONDS * 1000);

    // Generate human-readable message based on tool
    const message = this.generateConfirmationMessage(toolCall, toolDefinition);

    const confirmation: StoredConfirmation = {
      confirmationId,
      conversationId,
      userId,
      toolCall,
      toolName: toolCall.name,
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
      `Stored confirmation ${confirmationId} for tool ${toolCall.name} in conversation ${conversationId}`,
      { confirmationId, toolName: toolCall.name, conversationId }
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
   * Generate a human-readable confirmation message for a tool call
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

      default:
        return `Executar ${toolCall.name}?`;
    }
  }
}
