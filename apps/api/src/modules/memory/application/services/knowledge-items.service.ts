import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
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
import { ContradictionResolutionService, type ContradictionResolutionInfo } from './contradiction-resolution.service';

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
  /** Skip contradiction detection (e.g., during import) */
  skipContradictionCheck?: boolean;
}

/**
 * Result of adding a knowledge item
 */
export interface AddKnowledgeResult {
  /** The newly created item */
  item: KnowledgeItem;
  /** Information about superseded item if contradiction was resolved */
  superseded?: ContradictionResolutionInfo;
}

// Re-export for convenience
export type { ContradictionResolutionInfo };

/**
 * Paginated list response
 */
export interface PaginatedKnowledgeItems {
  items: KnowledgeItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  byArea: Record<LifeArea, number>;
  byType: Record<KnowledgeItemType, number>;
  total: number;
}

/**
 * Parameters for listing knowledge items
 */
export interface ListKnowledgeItemsParams {
  type?: KnowledgeItemType;
  area?: LifeArea;
  source?: KnowledgeItemSource;
  confidenceMin?: number;
  confidenceMax?: number;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;

  /**
   * Include superseded items in results (M1.6.1)
   * @default false
   */
  includeSuperseded?: boolean;
}

/**
 * Export response with temporal metadata (M1.6.1)
 */
export interface ExportKnowledgeItemsResponse {
  items: KnowledgeItem[];
  total: number;
  exportedAt: string;
  stats: {
    active: number;
    superseded: number;
  };
}

/**
 * Parameters for updating a knowledge item
 */
export interface UpdateKnowledgeItemParams {
  title?: string;
  content?: string;
  tags?: string[];
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
    private readonly knowledgeItemRepository: KnowledgeItemRepositoryPort,
    @Inject(forwardRef(() => ContradictionResolutionService))
    private readonly contradictionResolution: ContradictionResolutionService
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
   *
   * This method automatically checks for contradictions with existing items
   * in the same scope (type + area). If a contradiction is found, the old
   * item is superseded and the new item takes its place.
   *
   * @param userId - User ID
   * @param params - Parameters for the new item
   * @returns The created item and any superseded item info
   */
  async add(userId: string, params: AddKnowledgeParams): Promise<AddKnowledgeResult> {
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
      skipContradictionCheck = false,
    } = params;

    // Generate title if not provided (treat empty string as no title)
    const generatedTitle = title && title.length > 0 ? title : this.generateTitle(content, type);

    // Check for contradictions before adding (unless skipped)
    let supersededInfo: ContradictionResolutionInfo | undefined;

    if (!skipContradictionCheck) {
      const { shouldSupersede, explanation } =
        await this.contradictionResolution.checkBeforeAdd(userId, content, type, area);

      if (shouldSupersede) {
        supersededInfo = {
          supersededItemId: shouldSupersede.id,
          supersededContent: shouldSupersede.content,
          reason: explanation ?? 'Contradiction detected',
        };
        this.logger.log(
          `Will supersede item ${shouldSupersede.id} due to contradiction`,
          { userId, type, area, explanation }
        );
      }
    }

    this.logger.log(
      `Adding knowledge item for user ${userId}: ${type} - ${generatedTitle}`
    );

    // Create the new item
    const item = await this.knowledgeItemRepository.create(userId, {
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

    // Resolve contradiction if found (supersede old item with new one)
    if (supersededInfo) {
      await this.contradictionResolution.resolve(
        userId,
        supersededInfo.supersededItemId,
        item.id,
        supersededInfo.reason
      );
      return { item, superseded: supersededInfo };
    }

    return { item };
  }

  /**
   * List knowledge items with pagination and extended filters
   */
  async list(
    userId: string,
    options?: ListKnowledgeItemsParams
  ): Promise<PaginatedKnowledgeItems> {
    const {
      type,
      area,
      source,
      confidenceMin,
      confidenceMax,
      search,
      dateFrom,
      dateTo,
      limit = 20,
      offset = 0,
      includeSuperseded,
    } = options ?? {};

    // Build search params without undefined values (exactOptionalPropertyTypes)
    const searchParams: KnowledgeItemSearchParams = { limit, offset };
    if (type !== undefined) searchParams.type = type;
    if (area !== undefined) searchParams.area = area;
    if (source !== undefined) searchParams.source = source;
    if (confidenceMin !== undefined) searchParams.confidenceMin = confidenceMin;
    if (confidenceMax !== undefined) searchParams.confidenceMax = confidenceMax;
    if (search !== undefined) searchParams.query = search;
    if (dateFrom !== undefined) searchParams.dateFrom = dateFrom;
    if (dateTo !== undefined) searchParams.dateTo = dateTo;
    if (includeSuperseded !== undefined) searchParams.includeSuperseded = includeSuperseded;

    const countParams: Omit<KnowledgeItemSearchParams, 'limit' | 'offset'> = {};
    if (type !== undefined) countParams.type = type;
    if (area !== undefined) countParams.area = area;
    if (source !== undefined) countParams.source = source;
    if (confidenceMin !== undefined) countParams.confidenceMin = confidenceMin;
    if (confidenceMax !== undefined) countParams.confidenceMax = confidenceMax;
    if (search !== undefined) countParams.query = search;
    if (dateFrom !== undefined) countParams.dateFrom = dateFrom;
    if (dateTo !== undefined) countParams.dateTo = dateTo;
    if (includeSuperseded !== undefined) countParams.includeSuperseded = includeSuperseded;

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
   * Update a knowledge item (for corrections)
   */
  async update(
    userId: string,
    itemId: string,
    params: UpdateKnowledgeItemParams
  ): Promise<KnowledgeItem | null> {
    const { title, content, tags } = params;

    // Only include fields that are provided
    const updateData: Partial<Pick<KnowledgeItem, 'title' | 'content' | 'tags'>> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
      return this.knowledgeItemRepository.findById(userId, itemId);
    }

    this.logger.log(`Updating knowledge item ${itemId} for user ${userId}`);

    return this.knowledgeItemRepository.update(userId, itemId, updateData);
  }

  /**
   * Get memory statistics (counts by area and type)
   */
  async getStats(userId: string): Promise<MemoryStats> {
    const [byArea, byType] = await Promise.all([
      this.knowledgeItemRepository.countByArea(userId),
      this.knowledgeItemRepository.countByType(userId),
    ]);

    // Calculate total from type counts
    const total = Object.values(byType).reduce((sum, count) => sum + count, 0);

    return {
      byArea,
      byType,
      total,
    };
  }

  /**
   * Export all knowledge items for a user (M1.6.1)
   *
   * Includes ALL items (active and superseded) for complete history export.
   * Returns temporal statistics for active vs superseded items.
   */
  async exportAll(userId: string): Promise<ExportKnowledgeItemsResponse> {
    this.logger.log(`Exporting all knowledge items for user ${userId}`);

    // Fetch all items including superseded ones
    const items = await this.knowledgeItemRepository.search(userId, {
      includeSuperseded: true,
      limit: 10000, // No practical limit for export
    });

    // Calculate stats
    const superseded = items.filter((item) => item.supersededById !== null).length;
    const active = items.length - superseded;

    return {
      items,
      total: items.length,
      exportedAt: new Date().toISOString(),
      stats: {
        active,
        superseded,
      },
    };
  }

  /**
   * Generate a title from content
   */
  private generateTitle(content: string, type: KnowledgeItemType): string {
    // Get first sentence or first 100 chars
    // Use regex that doesn't break on decimal points (e.g., "R$ 15.000")
    // Match sentence-ending punctuation followed by space or end of string
    const sentenceEndRegex = /[.!?](?:\s|$)/;
    const match = sentenceEndRegex.exec(content);
    const firstSentence = match
      ? content.substring(0, match.index + 1) // Include the punctuation
      : content;

    const title =
      firstSentence.length <= 100
        ? firstSentence.trim()
        : content.substring(0, 97).trim() + '...';

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
