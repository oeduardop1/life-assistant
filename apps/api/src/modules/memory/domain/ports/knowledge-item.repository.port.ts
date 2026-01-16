import type {
  KnowledgeItem,
  NewKnowledgeItem,
  KnowledgeItemType,
  KnowledgeItemSource,
  LifeArea,
} from '@life-assistant/database';

/**
 * Search parameters for knowledge items
 */
export interface KnowledgeItemSearchParams {
  query?: string;
  type?: KnowledgeItemType;
  area?: LifeArea;
  source?: KnowledgeItemSource;
  confidenceMin?: number;
  confidenceMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;

  /**
   * Include superseded items in results (M1.6.1)
   * When true, returns items that have been replaced by newer versions
   * @default false
   */
  includeSuperseded?: boolean;
}

/**
 * Port for knowledge item persistence operations
 *
 * @see docs/specs/data-model.md §4.5 for knowledge_items entity
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

  /**
   * Count knowledge items by area for a user
   * Returns a record with counts for each life area
   */
  countByArea(userId: string): Promise<Record<LifeArea, number>>;

  /**
   * Count knowledge items by type for a user
   * Returns a record with counts for each knowledge item type
   */
  countByType(userId: string): Promise<Record<KnowledgeItemType, number>>;

  /**
   * Find all non-deleted knowledge items for export
   */
  findAll(userId: string): Promise<KnowledgeItem[]>;

  // =========================================================================
  // Contradiction Detection Methods
  // =========================================================================

  /**
   * Find active (non-superseded, non-deleted) items by type and area
   * Used for contradiction detection when adding new items
   */
  findActiveBySameScope(
    userId: string,
    type: KnowledgeItemType,
    area?: LifeArea | null,
    limit?: number
  ): Promise<KnowledgeItem[]>;

  /**
   * Supersede an item (mark as replaced by another due to contradiction)
   * Sets supersededById and supersededAt fields
   */
  supersede(
    userId: string,
    itemId: string,
    supersededById: string
  ): Promise<KnowledgeItem | null>;

  /**
   * Find superseded items for a user (audit/review purposes)
   */
  findSuperseded(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<KnowledgeItem[]>;
}

export const KNOWLEDGE_ITEM_REPOSITORY = Symbol('KNOWLEDGE_ITEM_REPOSITORY');
