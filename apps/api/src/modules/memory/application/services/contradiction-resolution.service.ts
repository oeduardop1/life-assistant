import { Injectable, Inject, Logger } from '@nestjs/common';
import type { KnowledgeItem, KnowledgeItemType, LifeArea } from '@life-assistant/database';
import {
  KNOWLEDGE_ITEM_REPOSITORY,
  type KnowledgeItemRepositoryPort,
} from '../../domain/ports/knowledge-item.repository.port';
import {
  CONTRADICTION_DETECTOR,
  type ContradictionDetectorPort,
} from '../../domain/ports/contradiction-detector.port';

/**
 * Minimum confidence threshold for accepting a contradiction.
 * Contradictions with lower confidence will be ignored to reduce false positives.
 */
const CONTRADICTION_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Maximum number of existing items to check for contradictions.
 * Limits LLM calls and processing time.
 */
const MAX_ITEMS_TO_CHECK = 20;

/**
 * Result of checking for contradictions before adding a new item.
 */
export interface ContradictionCheckBeforeAddResult {
  /** Item that should be superseded (if contradiction found) */
  shouldSupersede: KnowledgeItem | null;
  /** Explanation of why the items contradict (if found) */
  explanation: string | null;
}

/**
 * Information about a resolved contradiction.
 */
export interface ContradictionResolutionInfo {
  /** ID of the superseded item */
  supersededItemId: string;
  /** Content of the superseded item */
  supersededContent: string;
  /** Explanation of why it was superseded */
  reason: string;
}

/**
 * ContradictionResolutionService - Orchestrates contradiction detection and resolution.
 *
 * This service:
 * 1. Checks for contradictions before adding new knowledge items
 * 2. Resolves contradictions by superseding old items
 * 3. Maintains an audit trail of supersessions
 *
 * Part of M1.6.1 - Contradiction Detection for Memory System.
 *
 * @see docs/specs/ai.md for memory management
 */
@Injectable()
export class ContradictionResolutionService {
  private readonly logger = new Logger(ContradictionResolutionService.name);

  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY)
    private readonly knowledgeItemRepository: KnowledgeItemRepositoryPort,
    @Inject(CONTRADICTION_DETECTOR)
    private readonly contradictionDetector: ContradictionDetectorPort
  ) {}

  /**
   * Check for contradictions before adding a new item.
   *
   * Searches for existing items in the same scope (type + area) and checks
   * if any contradict the new content.
   *
   * @param userId - User ID
   * @param newContent - Content of the new item to add
   * @param type - Type of knowledge item
   * @param area - Life area (optional)
   * @returns Result with item to supersede (if contradiction found)
   */
  async checkBeforeAdd(
    userId: string,
    newContent: string,
    type: KnowledgeItemType,
    area?: LifeArea | null
  ): Promise<ContradictionCheckBeforeAddResult> {
    // Find existing items in the same scope
    const existingItems = await this.knowledgeItemRepository.findActiveBySameScope(
      userId,
      type,
      area,
      MAX_ITEMS_TO_CHECK
    );

    if (existingItems.length === 0) {
      return { shouldSupersede: null, explanation: null };
    }

    this.logger.debug(
      `Checking ${String(existingItems.length)} existing items for contradictions`,
      { userId, type, area }
    );

    // Check for contradictions
    const results = await this.contradictionDetector.batchCheckContradictions(
      newContent,
      existingItems.map((item) => ({
        id: item.id,
        content: item.content,
        title: item.title,
      })),
      { type, area }
    );

    // Find the highest-confidence contradiction above threshold
    const contradictions = results
      .filter(
        (r) =>
          r.result.isContradiction &&
          r.result.confidence >= CONTRADICTION_CONFIDENCE_THRESHOLD
      )
      .sort((a, b) => b.result.confidence - a.result.confidence);

    const topContradiction = contradictions[0];
    if (!topContradiction) {
      return { shouldSupersede: null, explanation: null };
    }

    // Get the item with the highest-confidence contradiction
    const itemToSupersede = existingItems.find(
      (item) => item.id === topContradiction.itemId
    );

    if (!itemToSupersede) {
      this.logger.warn('Contradiction detected but item not found', {
        itemId: topContradiction.itemId,
      });
      return { shouldSupersede: null, explanation: null };
    }

    this.logger.log(
      `Contradiction detected: "${itemToSupersede.content.substring(0, 50)}..." contradicts new content`,
      {
        userId,
        oldItemId: itemToSupersede.id,
        confidence: topContradiction.result.confidence,
        explanation: topContradiction.result.explanation,
      }
    );

    return {
      shouldSupersede: itemToSupersede,
      explanation: topContradiction.result.explanation,
    };
  }

  /**
   * Resolve a contradiction by superseding the old item.
   *
   * Marks the old item as superseded by the new item.
   *
   * @param userId - User ID
   * @param oldItemId - ID of the item to supersede
   * @param newItemId - ID of the new item that supersedes it
   * @param explanation - Explanation of why the items contradict
   */
  async resolve(
    userId: string,
    oldItemId: string,
    newItemId: string,
    explanation: string
  ): Promise<void> {
    const updated = await this.knowledgeItemRepository.supersede(
      userId,
      oldItemId,
      newItemId
    );

    if (updated) {
      this.logger.log(
        `Superseded item ${oldItemId} with ${newItemId}: ${explanation}`,
        { userId }
      );
    } else {
      this.logger.warn(
        `Failed to supersede item ${oldItemId} - may have already been superseded`,
        { userId }
      );
    }
  }

  /**
   * Find contradictions within a group of existing items.
   *
   * Used during consolidation to detect and resolve duplicates.
   *
   * @param _userId - User ID (for logging/audit purposes)
   * @param items - Items to check for mutual contradictions
   * @returns Array of contradiction pairs with the item to keep and item to supersede
   */
  async findContradictionsInGroup(
    _userId: string,
    items: KnowledgeItem[]
  ): Promise<
    {
      keep: KnowledgeItem;
      supersede: KnowledgeItem;
      explanation: string;
    }[]
  > {
    if (items.length < 2) {
      return [];
    }

    const contradictions: {
      keep: KnowledgeItem;
      supersede: KnowledgeItem;
      explanation: string;
    }[] = [];

    // Check each pair (but avoid checking A vs B and B vs A)
    const checked = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const itemA = items[i];
      if (!itemA) continue;

      const context = { type: itemA.type, area: itemA.area };

      // Check against remaining items
      const itemsToCheck = items
        .slice(i + 1)
        .filter((item) => !checked.has(`${item.id}-${itemA.id}`));

      if (itemsToCheck.length === 0) continue;

      const results = await this.contradictionDetector.batchCheckContradictions(
        itemA.content,
        itemsToCheck.map((item) => ({
          id: item.id,
          content: item.content,
          title: item.title,
        })),
        context
      );

      for (const result of results) {
        if (
          result.result.isContradiction &&
          result.result.confidence >= CONTRADICTION_CONFIDENCE_THRESHOLD
        ) {
          const itemB = itemsToCheck.find((item) => item.id === result.itemId);
          if (!itemB) continue;

          // Mark this pair as checked
          checked.add(`${itemA.id}-${itemB.id}`);

          // Determine which to keep based on:
          // 1. User-validated items take precedence
          // 2. Higher confidence wins
          // 3. More recent wins (tie-breaker)
          const { keep, supersede } = this.decideWhichToKeep(itemA, itemB);

          contradictions.push({
            keep,
            supersede,
            explanation: result.result.explanation,
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Decide which item to keep when two items contradict.
   *
   * Priority:
   * 1. User-validated items win
   * 2. Higher confidence wins
   * 3. More recent wins (tie-breaker)
   */
  private decideWhichToKeep(
    itemA: KnowledgeItem,
    itemB: KnowledgeItem
  ): { keep: KnowledgeItem; supersede: KnowledgeItem } {
    // User-validated items take precedence
    if (itemA.validatedByUser && !itemB.validatedByUser) {
      return { keep: itemA, supersede: itemB };
    }
    if (itemB.validatedByUser && !itemA.validatedByUser) {
      return { keep: itemB, supersede: itemA };
    }

    // Higher confidence wins
    if (itemA.confidence > itemB.confidence) {
      return { keep: itemA, supersede: itemB };
    }
    if (itemB.confidence > itemA.confidence) {
      return { keep: itemB, supersede: itemA };
    }

    // More recent wins (tie-breaker)
    if (itemA.createdAt > itemB.createdAt) {
      return { keep: itemA, supersede: itemB };
    }

    return { keep: itemB, supersede: itemA };
  }
}
