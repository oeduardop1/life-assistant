import type {
  TrackingEntry,
  NewTrackingEntry,
  TrackingType,
} from '@life-assistant/database';

/**
 * Search parameters for tracking entries
 */
export interface TrackingEntrySearchParams {
  type?: string;
  area?: string;
  startDate?: Date;
  endDate?: Date;
  source?: string;
  limit?: number;
  offset?: number;
}

/**
 * Aggregation result for a metric type
 */
export interface TrackingAggregation {
  type: string;
  average: number | null;
  sum: number | null;
  min: number | null;
  max: number | null;
  count: number;
  latestValue: number | null;
  previousValue: number | null;
  variation: number | null; // percentage change
}

/**
 * Port for tracking entry persistence operations
 *
 * @see docs/specs/data-model.md §4.3 for tracking_entries entity
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export interface TrackingEntryRepositoryPort {
  /**
   * Create a new tracking entry
   */
  create(userId: string, data: Omit<NewTrackingEntry, 'userId'>): Promise<TrackingEntry>;

  /**
   * Find tracking entries for a user with filters
   */
  findByUserId(userId: string, params: TrackingEntrySearchParams): Promise<TrackingEntry[]>;

  /**
   * Find a tracking entry by ID
   */
  findById(userId: string, entryId: string): Promise<TrackingEntry | null>;

  /**
   * Update a tracking entry
   */
  update(
    userId: string,
    entryId: string,
    data: Partial<Omit<NewTrackingEntry, 'userId'>>
  ): Promise<TrackingEntry | null>;

  /**
   * Delete a tracking entry
   */
  delete(userId: string, entryId: string): Promise<boolean>;

  /**
   * Get aggregations for a specific type within date range
   * Used for dashboard stats and trends
   */
  getAggregationByType(
    userId: string,
    type: string,
    startDate: Date,
    endDate: Date
  ): Promise<TrackingAggregation>;

  /**
   * Get latest entry for each type
   * Used for quick dashboard display
   */
  getLatestByType(userId: string, types: TrackingType[]): Promise<Map<TrackingType, TrackingEntry>>;

  /**
   * Count entries by type for a user
   */
  countByType(userId: string): Promise<Record<TrackingType, number>>;
}

export const TRACKING_ENTRY_REPOSITORY = Symbol('TRACKING_ENTRY_REPOSITORY');
