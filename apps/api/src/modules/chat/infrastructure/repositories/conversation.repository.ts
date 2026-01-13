import { Injectable } from '@nestjs/common';
import { eq, and, isNull, desc } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { ConversationRepositoryPort } from '../../domain/ports/conversation.repository.port';
import type { Conversation, NewConversation } from '@life-assistant/database';

/**
 * Drizzle implementation of ConversationRepositoryPort
 *
 * Uses RLS via withUserId for all operations
 */
@Injectable()
export class ConversationRepository implements ConversationRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    data: Omit<NewConversation, 'userId'>
  ): Promise<Conversation> {
    return this.db.withUserId(userId, async (db) => {
      const [conversation] = await db
        .insert(this.db.schema.conversations)
        .values({
          ...data,
          userId,
        })
        .returning();

      if (!conversation) {
        throw new Error('Failed to create conversation');
      }

      return conversation;
    });
  }

  async findById(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    return this.db.withUserId(userId, async (db) => {
      const [conversation] = await db
        .select()
        .from(this.db.schema.conversations)
        .where(
          and(
            eq(this.db.schema.conversations.id, conversationId),
            eq(this.db.schema.conversations.userId, userId),
            isNull(this.db.schema.conversations.deletedAt)
          )
        )
        .limit(1);
      return conversation ?? null;
    });
  }

  async findAllByUserId(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Conversation[]> {
    const { limit = 50, offset = 0 } = options;

    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.conversations)
        .where(
          and(
            eq(this.db.schema.conversations.userId, userId),
            isNull(this.db.schema.conversations.deletedAt)
          )
        )
        .orderBy(desc(this.db.schema.conversations.updatedAt))
        .limit(limit)
        .offset(offset);
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const result = await db
        .select({ count: this.db.schema.conversations.id })
        .from(this.db.schema.conversations)
        .where(
          and(
            eq(this.db.schema.conversations.userId, userId),
            isNull(this.db.schema.conversations.deletedAt)
          )
        );
      return result.length;
    });
  }

  async update(
    userId: string,
    conversationId: string,
    data: Partial<Pick<Conversation, 'title' | 'metadata'>>
  ): Promise<Conversation | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.conversations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.conversations.id, conversationId),
            eq(this.db.schema.conversations.userId, userId),
            isNull(this.db.schema.conversations.deletedAt)
          )
        )
        .returning();
      return updated ?? null;
    });
  }

  async softDelete(userId: string, conversationId: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .update(this.db.schema.conversations)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.conversations.id, conversationId),
            eq(this.db.schema.conversations.userId, userId),
            isNull(this.db.schema.conversations.deletedAt)
          )
        )
        .returning();
      return !!deleted;
    });
  }
}
