import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import type {
  TrackingEntry,
  TrackingType,
  LifeArea,
  SubArea,
} from '@life-assistant/database';
import {
  TrackingEntryRepositoryPort,
  TRACKING_ENTRY_REPOSITORY,
  type TrackingEntrySearchParams,
  type TrackingAggregation,
} from '../../domain/ports/tracking-entry.repository.port';

/**
 * Parameters for recording a metric (from chat or form)
 * @see ADR-015 for Low Friction Tracking Philosophy
 * @see ADR-017 for Life Areas restructuring (6 areas + sub-areas)
 */
export interface RecordMetricParams {
  type: string; // TrackingType as string for flexibility
  area: string; // LifeArea as string for flexibility
  subArea?: string | undefined; // SubArea as string for flexibility (ADR-017)
  value: number;
  unit?: string | undefined;
  entryDate: string;
  entryTime?: string | undefined;
  source?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Paginated list response
 */
export interface PaginatedTrackingEntries {
  entries: TrackingEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * Tracking statistics by type
 */
export interface TrackingStats {
  byType: Record<string, number>;
  total: number;
}

/**
 * Validation rules by tracking type
 * @see docs/specs/system.md §3.3
 * @see ADR-017 for Life Areas restructuring (6 areas + sub-areas)
 */
const VALIDATION_RULES: Record<
  string,
  {
    minValue?: number;
    maxValue?: number;
    defaultUnit: string;
    defaultArea: LifeArea;
    defaultSubArea?: string;
  }
> = {
  weight: { minValue: 0.1, maxValue: 500, defaultUnit: 'kg', defaultArea: 'health', defaultSubArea: 'physical' },
  water: { minValue: 1, maxValue: 10000, defaultUnit: 'ml', defaultArea: 'health', defaultSubArea: 'physical' },
  sleep: { minValue: 0.1, maxValue: 24, defaultUnit: 'hours', defaultArea: 'health', defaultSubArea: 'physical' },
  exercise: { minValue: 1, maxValue: 1440, defaultUnit: 'min', defaultArea: 'health', defaultSubArea: 'physical' },
  mood: { minValue: 1, maxValue: 10, defaultUnit: 'score', defaultArea: 'health', defaultSubArea: 'mental' },
  energy: { minValue: 1, maxValue: 10, defaultUnit: 'score', defaultArea: 'health', defaultSubArea: 'mental' },
  custom: { defaultUnit: 'unit', defaultArea: 'learning', defaultSubArea: 'informal' },
};

/**
 * Service for tracking metrics
 *
 * @see docs/specs/data-model.md §4.3 for tracking_entries entity
 * @see docs/specs/system.md §3.3 for validation rules
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @Inject(TRACKING_ENTRY_REPOSITORY)
    private readonly trackingRepository: TrackingEntryRepositoryPort
  ) {}

  /**
   * Record a metric (from chat or form)
   *
   * Validates input according to type-specific rules before saving.
   * This is the main entry point for both conversational capture and manual form submission.
   *
   * @param userId - User ID
   * @param params - Metric parameters
   * @returns Created tracking entry
   */
  async recordMetric(userId: string, params: RecordMetricParams): Promise<TrackingEntry> {
    const { type, value, entryDate, source = 'form' } = params;

    // Validate value according to type-specific rules
    this.validateValue(type, value);

    // Get defaults for this type (ADR-017: includes defaultSubArea)
    const defaultRules = { defaultUnit: 'unit', defaultArea: 'learning' as LifeArea, defaultSubArea: 'informal' as SubArea };
    const rules = VALIDATION_RULES[type] ?? defaultRules;
    const unit = params.unit ?? rules.defaultUnit;
    const area = params.area as LifeArea;
    const subArea = (params.subArea ?? rules.defaultSubArea) as SubArea | undefined;

    this.logger.log(
      `Recording metric for user ${userId}: ${type} = ${String(value)} ${unit}`,
      { source, entryDate, subArea }
    );

    return this.trackingRepository.create(userId, {
      type: type as TrackingType,
      area,
      subArea,
      value: value.toString(),
      unit,
      entryDate,
      entryTime: params.entryTime ? new Date(params.entryTime) : undefined,
      source,
      metadata: params.metadata ?? {},
    });
  }

  /**
   * Get tracking history with filters
   * ADR-017: Added subArea filtering
   */
  async getHistory(
    userId: string,
    params: {
      type?: string | undefined;
      area?: string | undefined;
      subArea?: string | undefined;
      startDate?: string | undefined;
      endDate?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    }
  ): Promise<PaginatedTrackingEntries> {
    const { type, area, subArea, startDate, endDate, limit = 50, offset = 0 } = params;

    const searchParams: TrackingEntrySearchParams = { limit, offset };
    if (type) searchParams.type = type;
    if (area) searchParams.area = area;
    if (subArea) searchParams.subArea = subArea;
    if (startDate) searchParams.startDate = new Date(startDate);
    if (endDate) searchParams.endDate = new Date(endDate);

    const entries = await this.trackingRepository.findByUserId(userId, searchParams);

    // Count total for pagination
    const countParams: TrackingEntrySearchParams = { limit: 10000 };
    if (type) countParams.type = type;
    if (area) countParams.area = area;
    if (subArea) countParams.subArea = subArea;
    if (startDate) countParams.startDate = new Date(startDate);
    if (endDate) countParams.endDate = new Date(endDate);

    const allEntries = await this.trackingRepository.findByUserId(userId, countParams);
    const total = allEntries.length;

    return {
      entries,
      total,
      hasMore: offset + entries.length < total,
    };
  }

  /**
   * Get a single entry by ID
   */
  async getEntry(userId: string, entryId: string): Promise<TrackingEntry | null> {
    return this.trackingRepository.findById(userId, entryId);
  }

  /**
   * Update an entry
   */
  async updateEntry(
    userId: string,
    entryId: string,
    params: {
      value?: number | undefined;
      unit?: string | undefined;
      entryDate?: string | undefined;
      entryTime?: string | undefined;
      metadata?: Record<string, unknown> | undefined;
    }
  ): Promise<TrackingEntry | null> {
    const existingEntry = await this.trackingRepository.findById(userId, entryId);
    if (!existingEntry) {
      return null;
    }

    // Validate new value if provided
    if (params.value !== undefined) {
      this.validateValue(existingEntry.type, params.value);
    }

    const updateData: Record<string, unknown> = {};
    if (params.value !== undefined) updateData.value = params.value.toString();
    if (params.unit !== undefined) updateData.unit = params.unit;
    if (params.entryDate !== undefined) updateData.entryDate = params.entryDate;
    if (params.entryTime !== undefined) updateData.entryTime = new Date(params.entryTime);
    if (params.metadata !== undefined) updateData.metadata = params.metadata;

    return this.trackingRepository.update(userId, entryId, updateData);
  }

  /**
   * Delete an entry
   */
  async deleteEntry(userId: string, entryId: string): Promise<boolean> {
    return this.trackingRepository.delete(userId, entryId);
  }

  /**
   * Get aggregations for a specific type
   *
   * Returns average, sum, min, max, and variation for the specified period.
   * Defaults to last 7 days if no date range provided.
   */
  async getAggregations(
    userId: string,
    type: string,
    startDate?: string,
    endDate?: string
  ): Promise<TrackingAggregation> {
    // Default to last 7 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.trackingRepository.getAggregationByType(userId, type, start, end);
  }

  /**
   * Get latest entries for multiple types
   *
   * Useful for dashboard quick display.
   */
  async getLatestByTypes(
    userId: string,
    types: TrackingType[]
  ): Promise<Map<TrackingType, TrackingEntry>> {
    return this.trackingRepository.getLatestByType(userId, types);
  }

  /**
   * Get tracking statistics
   */
  async getStats(userId: string): Promise<TrackingStats> {
    const byType = await this.trackingRepository.countByType(userId);
    const total = Object.values(byType).reduce((sum, count) => sum + count, 0);

    return {
      byType,
      total,
    };
  }

  /**
   * Validate value according to type-specific rules
   * @throws BadRequestException if validation fails
   */
  private validateValue(type: string, value: number): void {
    const rules = VALIDATION_RULES[type];
    if (!rules) {
      return; // No validation rules for this type (custom)
    }

    if (rules.minValue !== undefined && value < rules.minValue) {
      throw new BadRequestException(
        `Value for ${type} must be at least ${String(rules.minValue)}`
      );
    }

    if (rules.maxValue !== undefined && value > rules.maxValue) {
      throw new BadRequestException(
        `Value for ${type} must be at most ${String(rules.maxValue)}`
      );
    }
  }
}
