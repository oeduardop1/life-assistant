import type { KnowledgeItemType, LifeArea } from '@life-assistant/database';

/**
 * Result of checking two knowledge items for contradiction.
 */
export interface ContradictionCheckResult {
  /** Whether the items contradict each other */
  isContradiction: boolean;
  /** Confidence in the contradiction assessment (0-1) */
  confidence: number;
  /** Brief explanation of why they contradict (or don't) */
  explanation: string;
}

/**
 * Context for contradiction checking.
 */
export interface ContradictionContext {
  /** Type of knowledge item */
  type: KnowledgeItemType;
  /** Life area (optional) - can be undefined, null, or a LifeArea value */
  area?: LifeArea | null | undefined;
}

/**
 * Item to check against for contradictions.
 */
export interface ExistingItemForCheck {
  /** Item ID */
  id: string;
  /** Item content */
  content: string;
  /** Item title (optional) */
  title?: string | null;
}

/**
 * Result of batch contradiction check.
 */
export interface BatchContradictionResult {
  /** ID of the existing item that was checked */
  itemId: string;
  /** Result of the contradiction check */
  result: ContradictionCheckResult;
}

/**
 * Port for detecting contradictions between knowledge items.
 *
 * Uses LLM to semantically compare facts and determine if they contradict.
 * This is part of the contradiction detection system (M1.6.1).
 *
 * @see docs/specs/engineering.md §8 for LLM abstraction patterns
 */
export interface ContradictionDetectorPort {
  /**
   * Check if new content contradicts an existing item.
   *
   * @param newContent - Content of the new item to add
   * @param existingContent - Content of the existing item
   * @param context - Context for the comparison (type, area)
   * @returns Result indicating if contradiction exists
   */
  checkContradiction(
    newContent: string,
    existingContent: string,
    context: ContradictionContext
  ): Promise<ContradictionCheckResult>;

  /**
   * Check new content against multiple existing items.
   * More efficient than calling checkContradiction multiple times.
   *
   * @param newContent - Content of the new item to add
   * @param existingItems - Existing items to check against
   * @param context - Context for the comparison (type, area)
   * @returns Array of results for each existing item
   */
  batchCheckContradictions(
    newContent: string,
    existingItems: ExistingItemForCheck[],
    context: ContradictionContext
  ): Promise<BatchContradictionResult[]>;
}

export const CONTRADICTION_DETECTOR = Symbol('CONTRADICTION_DETECTOR');
