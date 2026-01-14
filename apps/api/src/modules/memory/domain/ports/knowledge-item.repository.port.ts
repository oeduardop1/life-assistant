import type {
  KnowledgeItem,
  NewKnowledgeItem,
  KnowledgeItemType,
  LifeArea,
} from '@life-assistant/database';

/**
 * Search parameters for knowledge items
 */
export interface KnowledgeItemSearchParams {
  query?: string;
  type?: KnowledgeItemType;
  area?: LifeArea;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}

/**
 * Port for knowledge item persistence operations
 *
 * @see DATA_MODEL.md §4.5 for knowledge_items entity
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
export interface KnowledgeItemRepositoryPort {
  /**
   * Search knowledge items for a user
   * Supports full-text search on content and title
   */
  search(userId: string, params: KnowledgeItemSearchParams): Promise<KnowledgeItem[]>;

  /**
   * Count knowledge items matching search criteria
   */
  countSearch(userId: string, params: Omit<KnowledgeItemSearchParams, 'limit' | 'offset'>): Promise<number>;

  /**
   * Find a knowledge item by ID
   */
  findById(userId: string, itemId: string): Promise<KnowledgeItem | null>;

  /**
   * Create a new knowledge item
   */
  create(userId: string, data: Omit<NewKnowledgeItem, 'userId'>): Promise<KnowledgeItem>;

  /**
   * Create multiple knowledge items in a batch
   */
  createMany(userId: string, items: Omit<NewKnowledgeItem, 'userId'>[]): Promise<KnowledgeItem[]>;

  /**
   * Update a knowledge item
   */
  update(
    userId: string,
    itemId: string,
    data: Partial<Pick<KnowledgeItem, 'content' | 'title' | 'confidence' | 'validatedByUser' | 'tags' | 'relatedItems'>>
  ): Promise<KnowledgeItem | null>;

  /**
   * Soft delete a knowledge item
   * Sets deletedAt timestamp
   */
  softDelete(userId: string, itemId: string): Promise<boolean>;

  /**
   * Find all knowledge items by type for a user
   */
  findByType(userId: string, type: KnowledgeItemType, limit?: number): Promise<KnowledgeItem[]>;

  /**
   * Find all knowledge items by area for a user
   */
  findByArea(userId: string, area: LifeArea, limit?: number): Promise<KnowledgeItem[]>;
}

export const KNOWLEDGE_ITEM_REPOSITORY = Symbol('KNOWLEDGE_ITEM_REPOSITORY');
