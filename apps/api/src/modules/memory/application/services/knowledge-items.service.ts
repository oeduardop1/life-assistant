import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  KnowledgeItem,
  KnowledgeItemType,
  KnowledgeItemSource,
  LifeArea,
} from '@life-assistant/database';
import {
  KnowledgeItemRepositoryPort,
  KNOWLEDGE_ITEM_REPOSITORY,
  type KnowledgeItemSearchParams,
} from '../../domain/ports/knowledge-item.repository.port';

/**
 * Parameters for adding a knowledge item
 */
export interface AddKnowledgeParams {
  type: KnowledgeItemType;
  content: string;
  area?: LifeArea;
  title?: string;
  confidence?: number;
  source: KnowledgeItemSource;
  sourceRef?: string;
  inferenceEvidence?: string;
  tags?: string[];
}

/**
 * Paginated list response
 */
export interface PaginatedKnowledgeItems {
  items: KnowledgeItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Service for managing knowledge items
 *
 * @see DATA_MODEL.md §4.5 for knowledge_items entity
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
@Injectable()
export class KnowledgeItemsService {
  private readonly logger = new Logger(KnowledgeItemsService.name);

  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY)
    private readonly knowledgeItemRepository: KnowledgeItemRepositoryPort
  ) {}

  /**
   * Search knowledge items (for search_knowledge tool)
   */
  async search(
    userId: string,
    params: {
      query?: string;
      type?: KnowledgeItemType;
      area?: LifeArea;
      limit?: number;
    }
  ): Promise<KnowledgeItem[]> {
    const { query, type, area, limit = 5 } = params;

    // Build search params without undefined values (exactOptionalPropertyTypes)
    const searchParams: KnowledgeItemSearchParams = { limit };
    if (query !== undefined) searchParams.query = query;
    if (type !== undefined) searchParams.type = type;
    if (area !== undefined) searchParams.area = area;

    return this.knowledgeItemRepository.search(userId, searchParams);
  }

  /**
   * Add a knowledge item (for add_knowledge tool)
   */
  async add(userId: string, params: AddKnowledgeParams): Promise<KnowledgeItem> {
    const {
      type,
      content,
      area,
      title,
      confidence = 0.9,
      source,
      sourceRef,
      inferenceEvidence,
      tags = [],
    } = params;

    // Generate title if not provided (treat empty string as no title)
    const generatedTitle = title && title.length > 0 ? title : this.generateTitle(content, type);

    this.logger.log(
      `Adding knowledge item for user ${userId}: ${type} - ${generatedTitle}`
    );

    return this.knowledgeItemRepository.create(userId, {
      type,
      content,
      area,
      title: generatedTitle,
      confidence: Math.max(0, Math.min(1, confidence)), // Clamp to 0-1
      source,
      sourceRef,
      inferenceEvidence,
      tags,
    });
  }

  /**
   * List knowledge items with pagination
   */
  async list(
    userId: string,
    options?: {
      type?: KnowledgeItemType;
      area?: LifeArea;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedKnowledgeItems> {
    const { type, area, limit = 20, offset = 0 } = options ?? {};

    // Build search params without undefined values (exactOptionalPropertyTypes)
    const searchParams: KnowledgeItemSearchParams = { limit, offset };
    if (type !== undefined) searchParams.type = type;
    if (area !== undefined) searchParams.area = area;

    const countParams: Omit<KnowledgeItemSearchParams, 'limit' | 'offset'> = {};
    if (type !== undefined) countParams.type = type;
    if (area !== undefined) countParams.area = area;

    const [items, total] = await Promise.all([
      this.knowledgeItemRepository.search(userId, searchParams),
      this.knowledgeItemRepository.countSearch(userId, countParams),
    ]);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Delete a knowledge item (soft delete)
   */
  async delete(userId: string, itemId: string): Promise<boolean> {
    return this.knowledgeItemRepository.softDelete(userId, itemId);
  }

  /**
   * Validate a knowledge item (mark as validated by user)
   */
  async validate(userId: string, itemId: string): Promise<KnowledgeItem | null> {
    return this.knowledgeItemRepository.update(userId, itemId, {
      validatedByUser: true,
      confidence: 1.0, // User validation = 100% confidence
    });
  }

  /**
   * Update confidence of a knowledge item
   */
  async updateConfidence(
    userId: string,
    itemId: string,
    confidence: number
  ): Promise<KnowledgeItem | null> {
    return this.knowledgeItemRepository.update(userId, itemId, {
      confidence: Math.max(0, Math.min(1, confidence)),
    });
  }

  /**
   * Find by ID
   */
  async findById(userId: string, itemId: string): Promise<KnowledgeItem | null> {
    return this.knowledgeItemRepository.findById(userId, itemId);
  }

  /**
   * Find all items by type
   */
  async findByType(
    userId: string,
    type: KnowledgeItemType,
    limit?: number
  ): Promise<KnowledgeItem[]> {
    return this.knowledgeItemRepository.findByType(userId, type, limit);
  }

  /**
   * Find all items by area
   */
  async findByArea(
    userId: string,
    area: LifeArea,
    limit?: number
  ): Promise<KnowledgeItem[]> {
    return this.knowledgeItemRepository.findByArea(userId, area, limit);
  }

  /**
   * Generate a title from content
   */
  private generateTitle(content: string, type: KnowledgeItemType): string {
    // Get first sentence or first 50 chars
    const firstSentence = content.split(/[.!?]/)[0];
    const title =
      firstSentence && firstSentence.length <= 100
        ? firstSentence
        : content.substring(0, 97) + '...';

    // Add type prefix for clarity
    const typeLabels: Record<KnowledgeItemType, string> = {
      fact: 'Fato',
      preference: 'Preferência',
      memory: 'Memória',
      insight: 'Insight',
      person: 'Pessoa',
    };

    return `${typeLabels[type]}: ${title}`;
  }
}
