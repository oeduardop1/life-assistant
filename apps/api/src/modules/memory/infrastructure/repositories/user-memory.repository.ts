import { Injectable } from '@nestjs/common';
import { eq } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { UserMemoryRepositoryPort } from '../../domain/ports/user-memory.repository.port';
import type { UserMemory, NewUserMemory } from '@life-assistant/database';

/**
 * Drizzle implementation of UserMemoryRepositoryPort
 *
 * Uses RLS via withUserId for all operations
 * @see DATA_MODEL.md §4.5 for user_memories entity
 */
@Injectable()
export class UserMemoryRepository implements UserMemoryRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async findByUserId(userId: string): Promise<UserMemory | null> {
    return this.db.withUserId(userId, async (db) => {
      const [memory] = await db
        .select()
        .from(this.db.schema.userMemories)
        .where(eq(this.db.schema.userMemories.userId, userId))
        .limit(1);
      return memory ?? null;
    });
  }

  async create(
    userId: string,
    data: Partial<Omit<NewUserMemory, 'userId'>>
  ): Promise<UserMemory> {
    return this.db.withUserId(userId, async (db) => {
      const [memory] = await db
        .insert(this.db.schema.userMemories)
        .values({
          ...data,
          userId,
        })
        .returning();

      if (!memory) {
        throw new Error('Failed to create user memory');
      }

      return memory;
    });
  }

  async update(
    userId: string,
    data: Partial<Omit<UserMemory, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'version'>>
  ): Promise<UserMemory | null> {
    return this.db.withUserId(userId, async (db) => {
      // Get current version for optimistic locking
      const current = await this.findByUserId(userId);
      if (!current) {
        return null;
      }

      const [updated] = await db
        .update(this.db.schema.userMemories)
        .set({
          ...data,
          version: current.version + 1,
          // updatedAt is handled by database trigger
        })
        .where(eq(this.db.schema.userMemories.userId, userId))
        .returning();

      return updated ?? null;
    });
  }

  async updateLastConsolidatedAt(userId: string, timestamp: Date): Promise<void> {
    await this.db.withUserId(userId, async (db) => {
      await db
        .update(this.db.schema.userMemories)
        .set({
          lastConsolidatedAt: timestamp,
          // updatedAt is handled by database trigger
        })
        .where(eq(this.db.schema.userMemories.userId, userId));
    });
  }
}
