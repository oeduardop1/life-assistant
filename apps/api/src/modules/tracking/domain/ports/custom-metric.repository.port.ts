import type {
  CustomMetricDefinition,
  NewCustomMetricDefinition,
} from '@life-assistant/database';

/**
 * Search parameters for custom metric definitions
 */
export interface CustomMetricSearchParams {
  isActive?: boolean | undefined;
  includeDeleted?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

/**
 * Port for custom metric definition persistence operations
 *
 * @see docs/specs/domains/tracking.md §4.2 for Custom Metrics spec
 */
export interface CustomMetricRepositoryPort {
  /**
   * Create a new custom metric definition
   */
  create(
    userId: string,
    data: Omit<NewCustomMetricDefinition, 'userId'>
  ): Promise<CustomMetricDefinition>;

  /**
   * Find custom metric definitions for a user with filters
   */
  findByUserId(
    userId: string,
    params: CustomMetricSearchParams
  ): Promise<CustomMetricDefinition[]>;

  /**
   * Find a custom metric definition by ID
   */
  findById(userId: string, metricId: string): Promise<CustomMetricDefinition | null>;

  /**
   * Find a custom metric definition by name (case-insensitive)
   */
  findByName(userId: string, name: string): Promise<CustomMetricDefinition | null>;

  /**
   * Update a custom metric definition
   */
  update(
    userId: string,
    metricId: string,
    data: Partial<Omit<NewCustomMetricDefinition, 'userId'>>
  ): Promise<CustomMetricDefinition | null>;

  /**
   * Soft delete a custom metric definition
   * Preserves tracking_entries history
   */
  delete(userId: string, metricId: string): Promise<boolean>;
}

export const CUSTOM_METRIC_REPOSITORY = Symbol('CUSTOM_METRIC_REPOSITORY');
