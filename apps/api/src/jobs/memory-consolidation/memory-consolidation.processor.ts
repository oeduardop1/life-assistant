import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  eq,
  and,
  gte,
  isNull,
  asc,
  type Message,
  type UserMemory,
  type KnowledgeItem,
  type MemoryUpdates,
} from '@life-assistant/database';
import {
  createLLMFromEnv,
  type LLMPort,
} from '@life-assistant/ai';
import { DatabaseService } from '../../database/database.service';
import { AppLoggerService } from '../../logger/logger.service';
import { UserMemoryService } from '../../modules/memory/application/services/user-memory.service';
import { KnowledgeItemsService } from '../../modules/memory/application/services/knowledge-items.service';
import { QUEUES } from '../queues';
import {
  buildConsolidationPrompt,
  parseConsolidationResponse,
  type ConsolidationResponse,
} from './consolidation-prompt';

/**
 * Job data for consolidation by timezone
 */
interface ConsolidationJobData {
  /** Timezone to process (e.g., 'America/Sao_Paulo') */
  timezone: string;
  /** Optional: specific user ID for manual trigger */
  userId?: string;
  /** ISO date string for deduplication */
  date: string;
}

/**
 * Result of consolidation job
 */
interface ConsolidationJobResult {
  /** Number of users processed */
  usersProcessed: number;
  /** Number of users with messages to consolidate */
  usersConsolidated: number;
  /** Number of users skipped (no messages) */
  usersSkipped: number;
  /** Number of errors */
  errors: number;
  /** Timestamp of completion */
  completedAt: string;
}

/**
 * User data for consolidation
 */
interface UserForConsolidation {
  id: string;
  name: string;
  timezone: string;
}

/**
 * MemoryConsolidationProcessor - Extracts facts from conversations daily
 *
 * Per AI_SPECS.md §6.5:
 * - Runs at 3:00 AM user's local time
 * - Extracts facts, preferences, and insights from conversations
 * - Updates user_memories and knowledge_items
 * - Creates audit log in memory_consolidations
 *
 * @see ENGINEERING.md §7 for job patterns
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
@Processor(QUEUES.MEMORY_CONSOLIDATION)
@Injectable()
export class MemoryConsolidationProcessor extends WorkerHost {
  private readonly llm: LLMPort;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: AppLoggerService,
    private readonly userMemoryService: UserMemoryService,
    private readonly knowledgeItemsService: KnowledgeItemsService
  ) {
    super();
    this.logger.setContext(MemoryConsolidationProcessor.name);
    this.llm = createLLMFromEnv();
  }

  /**
   * Process consolidation job for a timezone or specific user
   */
  async process(job: Job<ConsolidationJobData>): Promise<ConsolidationJobResult> {
    const { timezone, userId, date } = job.data;

    this.logger.log(`Starting memory consolidation for ${userId ? `user ${userId}` : `timezone ${timezone}`}`, {
      jobId: job.id,
      date,
    });

    // Get users to process
    const users = userId
      ? await this.getUserById(userId)
      : await this.getUsersByTimezone(timezone);

    let usersConsolidated = 0;
    let usersSkipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const consolidated = await this.processUser(user);
        if (consolidated) {
          usersConsolidated++;
        } else {
          usersSkipped++;
        }
      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to consolidate user ${user.id}: ${errorMessage}`);

        // Log failed consolidation
        await this.logConsolidation(user.id, {
          status: 'failed',
          errorMessage,
        });
      }
    }

    this.logger.log(
      `Consolidation complete: ${String(usersConsolidated)} consolidated, ${String(usersSkipped)} skipped, ${String(errors)} errors`
    );

    return {
      usersProcessed: users.length,
      usersConsolidated,
      usersSkipped,
      errors,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Process a single user's messages for consolidation
   * @returns true if messages were consolidated, false if skipped
   */
  private async processUser(user: UserForConsolidation): Promise<boolean> {
    this.logger.debug(`Processing user ${user.id} (${user.name})`);

    // Get user memory (or create default)
    const memory = await this.userMemoryService.getOrCreate(user.id);

    // Calculate time range
    const consolidatedFrom = memory.lastConsolidatedAt ?? memory.createdAt;
    const consolidatedTo = new Date();

    // Get messages since last consolidation
    const messages = await this.getMessagesSince(user.id, consolidatedFrom);

    if (messages.length === 0) {
      this.logger.debug(`No messages to consolidate for user ${user.id}`);
      return false;
    }

    this.logger.log(`Found ${String(messages.length)} messages to consolidate for user ${user.id}`);

    // Get existing knowledge items for context
    const existingKnowledge = await this.getExistingKnowledge(user.id);

    // Build consolidation prompt
    const prompt = buildConsolidationPrompt(
      messages,
      {
        bio: memory.bio,
        occupation: memory.occupation,
        familyContext: memory.familyContext,
        currentGoals: memory.currentGoals,
        currentChallenges: memory.currentChallenges,
        topOfMind: memory.topOfMind,
        values: memory.values,
      },
      existingKnowledge.map((k) => ({
        id: k.id,
        type: k.type,
        content: k.content,
        title: k.title ?? '',
      }))
    );

    // Call LLM
    const llmInfo = this.llm.getInfo();
    this.logger.debug(`Calling ${llmInfo.name}/${llmInfo.model} for consolidation`);

    const response = await this.llm.chat({
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse response
    const consolidationResult = parseConsolidationResponse(response.content);

    // Apply updates
    await this.applyConsolidationResult(user.id, consolidationResult);

    // Update last consolidated timestamp
    await this.userMemoryService.updateLastConsolidatedAt(user.id, consolidatedTo);

    // Log successful consolidation
    await this.logConsolidation(user.id, {
      status: 'completed',
      consolidatedFrom,
      consolidatedTo,
      messagesProcessed: messages.length,
      result: consolidationResult,
      rawOutput: response.content,
    });

    return true;
  }

  /**
   * Get users by timezone
   */
  private async getUsersByTimezone(timezone: string): Promise<UserForConsolidation[]> {
    const { users } = this.databaseService.schema;

    return this.databaseService.db
      .select({
        id: users.id,
        name: users.name,
        timezone: users.timezone,
      })
      .from(users)
      .where(
        and(
          eq(users.timezone, timezone),
          isNull(users.deletedAt),
          eq(users.status, 'active')
        )
      );
  }

  /**
   * Get a specific user by ID
   */
  private async getUserById(userId: string): Promise<UserForConsolidation[]> {
    const { users } = this.databaseService.schema;

    return this.databaseService.db
      .select({
        id: users.id,
        name: users.name,
        timezone: users.timezone,
      })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          isNull(users.deletedAt)
        )
      );
  }

  /**
   * Get all messages for a user since a given date
   * This queries across all conversations owned by the user
   */
  private async getMessagesSince(userId: string, since: Date): Promise<Message[]> {
    const { messages, conversations } = this.databaseService.schema;

    return this.databaseService.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        role: messages.role,
        content: messages.content,
        metadata: messages.metadata,
        actions: messages.actions,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.userId, userId),
          isNull(conversations.deletedAt),
          gte(messages.createdAt, since)
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  /**
   * Get existing knowledge items for a user (for prompt context)
   */
  private async getExistingKnowledge(userId: string): Promise<KnowledgeItem[]> {
    const { knowledgeItems } = this.databaseService.schema;

    return this.databaseService.db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.userId, userId),
          isNull(knowledgeItems.deletedAt)
        )
      )
      .orderBy(asc(knowledgeItems.createdAt))
      .limit(100); // Limit to avoid token overflow
  }

  /**
   * Apply consolidation result to memory and knowledge items
   */
  private async applyConsolidationResult(
    userId: string,
    result: ConsolidationResponse
  ): Promise<void> {
    // Apply memory updates
    const memoryUpdates = result.memory_updates;
    const updatePayload: Partial<UserMemory> = {};

    if (memoryUpdates.bio) updatePayload.bio = memoryUpdates.bio;
    if (memoryUpdates.occupation) updatePayload.occupation = memoryUpdates.occupation;
    if (memoryUpdates.familyContext) updatePayload.familyContext = memoryUpdates.familyContext;
    if (memoryUpdates.currentGoals) updatePayload.currentGoals = memoryUpdates.currentGoals;
    if (memoryUpdates.currentChallenges) updatePayload.currentChallenges = memoryUpdates.currentChallenges;
    if (memoryUpdates.topOfMind) updatePayload.topOfMind = memoryUpdates.topOfMind;
    if (memoryUpdates.values) updatePayload.values = memoryUpdates.values;
    if (memoryUpdates.learnedPatterns) updatePayload.learnedPatterns = memoryUpdates.learnedPatterns;

    if (Object.keys(updatePayload).length > 0) {
      await this.userMemoryService.update(userId, updatePayload);
      this.logger.debug(`Updated memory for user ${userId}`);
    }

    // Create new knowledge items
    for (const item of result.new_knowledge_items) {
      // Build params without undefined values (exactOptionalPropertyTypes)
      const params: Parameters<typeof this.knowledgeItemsService.add>[1] = {
        type: item.type,
        content: item.content,
        confidence: item.confidence,
        source: item.source,
      };
      if (item.area !== undefined) params.area = item.area;
      if (item.title !== undefined) params.title = item.title;
      if (item.inferenceEvidence !== undefined) params.inferenceEvidence = item.inferenceEvidence;

      await this.knowledgeItemsService.add(userId, params);
    }

    if (result.new_knowledge_items.length > 0) {
      this.logger.debug(`Created ${String(result.new_knowledge_items.length)} knowledge items for user ${userId}`);
    }

    // Update existing knowledge items
    for (const update of result.updated_knowledge_items) {
      if (update.content !== undefined) {
        const item = await this.knowledgeItemsService.findById(userId, update.id);
        if (item) {
          // Build update payload without undefined values
          const updatePayload: { content?: string; confidence?: number } = {
            content: update.content,
          };
          if (update.confidence !== undefined) {
            updatePayload.confidence = update.confidence;
          }
          await this.updateKnowledgeItem(userId, update.id, updatePayload);
        }
      } else if (update.confidence !== undefined) {
        await this.knowledgeItemsService.updateConfidence(userId, update.id, update.confidence);
      }
    }

    if (result.updated_knowledge_items.length > 0) {
      this.logger.debug(`Updated ${String(result.updated_knowledge_items.length)} knowledge items for user ${userId}`);
    }
  }

  /**
   * Update a knowledge item with partial data
   */
  private async updateKnowledgeItem(
    userId: string,
    itemId: string,
    updates: { content?: string; confidence?: number }
  ): Promise<void> {
    const { knowledgeItems } = this.databaseService.schema;

    await this.databaseService.withUserId(userId, async (db) => {
      await db
        .update(knowledgeItems)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(knowledgeItems.id, itemId),
            eq(knowledgeItems.userId, userId)
          )
        );
    });
  }

  /**
   * Log consolidation to memory_consolidations table
   */
  private async logConsolidation(
    userId: string,
    data: {
      status: 'completed' | 'failed';
      errorMessage?: string;
      consolidatedFrom?: Date;
      consolidatedTo?: Date;
      messagesProcessed?: number;
      result?: ConsolidationResponse;
      rawOutput?: string;
    }
  ): Promise<void> {
    const { memoryConsolidations } = this.databaseService.schema;

    const now = new Date();
    const factsCreated = data.result?.new_knowledge_items.length ?? 0;
    const factsUpdated = data.result?.updated_knowledge_items.length ?? 0;
    const inferencesCreated = data.result
      ? data.result.new_knowledge_items.filter((item) => item.inferenceEvidence !== undefined).length
      : 0;

    // Convert memory updates to MemoryUpdates type (handle exactOptionalPropertyTypes)
    const memoryUpdates = data.result?.memory_updates
      ? this.convertToMemoryUpdates(data.result.memory_updates)
      : undefined;

    await this.databaseService.db.insert(memoryConsolidations).values({
      userId,
      consolidatedFrom: data.consolidatedFrom ?? now,
      consolidatedTo: data.consolidatedTo ?? now,
      messagesProcessed: data.messagesProcessed ?? 0,
      factsCreated,
      factsUpdated,
      inferencesCreated,
      memoryUpdates,
      rawOutput: data.rawOutput,
      status: data.status,
      errorMessage: data.errorMessage,
    });
  }

  /**
   * Convert consolidation response memory_updates to MemoryUpdates type
   * This handles the exactOptionalPropertyTypes constraint by only including
   * properties that are actually defined (not undefined)
   */
  private convertToMemoryUpdates(
    updates: ConsolidationResponse['memory_updates']
  ): MemoryUpdates {
    const result: MemoryUpdates = {};

    if (updates.bio !== undefined) result.bio = updates.bio;
    if (updates.occupation !== undefined) result.occupation = updates.occupation;
    if (updates.familyContext !== undefined) result.familyContext = updates.familyContext;
    if (updates.currentGoals !== undefined) result.currentGoals = updates.currentGoals;
    if (updates.currentChallenges !== undefined) result.currentChallenges = updates.currentChallenges;
    if (updates.topOfMind !== undefined) result.topOfMind = updates.topOfMind;
    if (updates.values !== undefined) result.values = updates.values;
    if (updates.learnedPatterns !== undefined) result.learnedPatterns = updates.learnedPatterns;

    return result;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ConsolidationJobData>, result: ConsolidationJobResult) {
    this.logger.log(`Job ${job.id ?? 'unknown'} completed`, { result });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ConsolidationJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id ?? 'unknown'} failed after ${String(job.attemptsMade)} attempts: ${error.message}`
    );
  }
}
