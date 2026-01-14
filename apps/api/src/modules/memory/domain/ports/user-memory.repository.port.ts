import type { UserMemory, NewUserMemory } from '@life-assistant/database';

/**
 * Port for user memory persistence operations
 *
 * @see DATA_MODEL.md §4.5 for user_memories entity
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
export interface UserMemoryRepositoryPort {
  /**
   * Find user memory by user ID (one per user)
   */
  findByUserId(userId: string): Promise<UserMemory | null>;

  /**
   * Create a new user memory entry
   */
  create(userId: string, data: Partial<Omit<NewUserMemory, 'userId'>>): Promise<UserMemory>;

  /**
   * Update user memory (partial update)
   * Increments version automatically
   */
  update(
    userId: string,
    data: Partial<Omit<UserMemory, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'version'>>
  ): Promise<UserMemory | null>;

  /**
   * Update last consolidated timestamp
   */
  updateLastConsolidatedAt(userId: string, timestamp: Date): Promise<void>;
}

export const USER_MEMORY_REPOSITORY = Symbol('USER_MEMORY_REPOSITORY');
