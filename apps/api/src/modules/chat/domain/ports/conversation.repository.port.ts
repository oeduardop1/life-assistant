import type { Conversation, NewConversation } from '@life-assistant/database';

/**
 * Port for conversation persistence operations
 *
 * @see DATA_MODEL.md §4.2 for conversation entity
 */
export interface ConversationRepositoryPort {
  /**
   * Create a new conversation
   */
  create(
    userId: string,
    data: Omit<NewConversation, 'userId'>
  ): Promise<Conversation>;

  /**
   * Find a conversation by ID (respects RLS)
   */
  findById(userId: string, conversationId: string): Promise<Conversation | null>;

  /**
   * List all conversations for a user
   * Excludes soft-deleted conversations
   */
  findAllByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Conversation[]>;

  /**
   * Count total conversations for a user
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * Update a conversation
   */
  update(
    userId: string,
    conversationId: string,
    data: Partial<Pick<Conversation, 'title' | 'metadata'>>
  ): Promise<Conversation | null>;

  /**
   * Soft delete a conversation
   * Sets deletedAt timestamp
   */
  softDelete(userId: string, conversationId: string): Promise<boolean>;
}

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');
