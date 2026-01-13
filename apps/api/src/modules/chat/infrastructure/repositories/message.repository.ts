import { Injectable } from '@nestjs/common';
import { eq, and, asc, desc } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { MessageRepositoryPort } from '../../domain/ports/message.repository.port';
import type { Message, NewMessage } from '@life-assistant/database';

/**
 * Drizzle implementation of MessageRepositoryPort
 *
 * Uses RLS via withUserId for all operations
 * Note: Messages are accessed through their conversation, which enforces user ownership
 */
@Injectable()
export class MessageRepository implements MessageRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, data: NewMessage): Promise<Message> {
    return this.db.withUserTransaction(userId, async (db) => {
      // Insert the message
      const [message] = await db
        .insert(this.db.schema.messages)
        .values(data)
        .returning();

      if (!message) {
        throw new Error('Failed to create message');
      }

      // Update conversation's updatedAt
      await db
        .update(this.db.schema.conversations)
        .set({ updatedAt: new Date() })
        .where(eq(this.db.schema.conversations.id, data.conversationId));

      return message;
    });
  }

  async findByConversationId(
    userId: string,
    conversationId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Message[]> {
    const { limit = 100, offset = 0 } = options;

    return this.db.withUserId(userId, async (db) => {
      // First verify the user owns the conversation
      const [conversation] = await db
        .select({ id: this.db.schema.conversations.id })
        .from(this.db.schema.conversations)
        .where(
          and(
            eq(this.db.schema.conversations.id, conversationId),
            eq(this.db.schema.conversations.userId, userId)
          )
        )
        .limit(1);

      if (!conversation) {
        return [];
      }

      return db
        .select()
        .from(this.db.schema.messages)
        .where(eq(this.db.schema.messages.conversationId, conversationId))
        .orderBy(asc(this.db.schema.messages.createdAt))
        .limit(limit)
        .offset(offset);
    });
  }

  async countByConversationId(
    userId: string,
    conversationId: string
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      // First verify the user owns the conversation
      const [conversation] = await db
        .select({ id: this.db.schema.conversations.id })
        .from(this.db.schema.conversations)
        .where(
          and(
            eq(this.db.schema.conversations.id, conversationId),
            eq(this.db.schema.conversations.userId, userId)
          )
        )
        .limit(1);

      if (!conversation) {
        return 0;
      }

      const result = await db
        .select({ count: this.db.schema.messages.id })
        .from(this.db.schema.messages)
        .where(eq(this.db.schema.messages.conversationId, conversationId));

      return result.length;
    });
  }

  async getRecentMessages(
    userId: string,
    conversationId: string,
    limit: number
  ): Promise<Message[]> {
    return this.db.withUserId(userId, async (db) => {
      // First verify the user owns the conversation
      const [conversation] = await db
        .select({ id: this.db.schema.conversations.id })
        .from(this.db.schema.conversations)
        .where(
          and(
            eq(this.db.schema.conversations.id, conversationId),
            eq(this.db.schema.conversations.userId, userId)
          )
        )
        .limit(1);

      if (!conversation) {
        return [];
      }

      // Get messages ordered by most recent first, then reverse
      const messages = await db
        .select()
        .from(this.db.schema.messages)
        .where(eq(this.db.schema.messages.conversationId, conversationId))
        .orderBy(desc(this.db.schema.messages.createdAt))
        .limit(limit);

      // Return in chronological order (oldest first)
      return messages.reverse();
    });
  }
}
