import type { Message, NewMessage } from '@life-assistant/database';

/**
 * Port for message persistence operations
 *
 * @see DATA_MODEL.md §4.2 for message entity
 */
export interface MessageRepositoryPort {
  /**
   * Create a new message in a conversation
   */
  create(
    userId: string,
    data: NewMessage
  ): Promise<Message>;

  /**
   * Find messages by conversation ID
   * Returns messages ordered by creation time (oldest first)
   */
  findByConversationId(
    userId: string,
    conversationId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Message[]>;

  /**
   * Count messages in a conversation
   */
  countByConversationId(
    userId: string,
    conversationId: string
  ): Promise<number>;

  /**
   * Get the last N messages for context building
   */
  getRecentMessages(
    userId: string,
    conversationId: string,
    limit: number
  ): Promise<Message[]>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
