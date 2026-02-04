import { Injectable } from '@nestjs/common';
import { eq, and, gte, lte, desc, count, sql } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type {
  TrackingEntryRepositoryPort,
  TrackingEntrySearchParams,
  TrackingAggregation,
} from '../../domain/ports/tracking-entry.repository.port';
import type {
  TrackingEntry,
  NewTrackingEntry,
  TrackingType,
  LifeArea,
  SubArea,
} from '@life-assistant/database';

/**
 * Convert Date or string to YYYY-MM-DD string format.
 *
 * IMPORTANT: When passing a Date object, this uses toISOString() which converts to UTC.
 * This can cause timezone issues if the Date was created from a local time.
 * Prefer passing YYYY-MM-DD strings directly to avoid timezone conversion issues.
 *
 * @param date - Date object or YYYY-MM-DD string
 * @returns YYYY-MM-DD string
 */
function formatDateToString(date: Date | string): string {
  if (typeof date === 'string') {
    // Already a string - validate format and return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // If it's an ISO timestamp string, extract just the date part
    return date.split('T')[0] ?? '';
  }
  // Date object - convert to ISO and extract date
  // WARNING: This can cause timezone issues!
  return date.toISOString().split('T')[0] ?? '';
}

/**
 * Drizzle implementation of TrackingEntryRepositoryPort
 *
 * Uses RLS via withUserId for all operations
 * @see docs/specs/data-model.md §4.3 for tracking_entries entity
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
@Injectable()
export class TrackingEntryRepository implements TrackingEntryRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    data: Omit<NewTrackingEntry, 'userId'>
  ): Promise<TrackingEntry> {
    return this.db.withUserId(userId, async (db) => {
      const [entry] = await db
        .insert(this.db.schema.trackingEntries)
        .values({
          ...data,
          userId,
        })
        .returning();

      if (!entry) {
        throw new Error('Failed to create tracking entry');
      }

      return entry;
    });
  }

  async findByUserId(
    userId: string,
    params: TrackingEntrySearchParams
  ): Promise<TrackingEntry[]> {
    const { type, area, subArea, startDate, endDate, source, limit = 50, offset = 0 } = params;

    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.trackingEntries.userId, userId)];

      if (type) {
        conditions.push(eq(this.db.schema.trackingEntries.type, type as TrackingType));
      }

      if (area) {
        conditions.push(eq(this.db.schema.trackingEntries.area, area as LifeArea));
      }

      // ADR-017: Sub-area filtering
      if (subArea) {
        conditions.push(eq(this.db.schema.trackingEntries.subArea, subArea as SubArea));
      }

      if (source) {
        conditions.push(eq(this.db.schema.trackingEntries.source, source));
      }

      if (startDate) {
        conditions.push(gte(this.db.schema.trackingEntries.entryDate, formatDateToString(startDate)));
      }

      if (endDate) {
        conditions.push(lte(this.db.schema.trackingEntries.entryDate, formatDateToString(endDate)));
      }

      return db
        .select()
        .from(this.db.schema.trackingEntries)
        .where(and(...conditions))
        .orderBy(desc(this.db.schema.trackingEntries.entryDate), desc(this.db.schema.trackingEntries.createdAt))
        .limit(limit)
        .offset(offset);
    });
  }

  async findById(userId: string, entryId: string): Promise<TrackingEntry | null> {
    return this.db.withUserId(userId, async (db) => {
      const [entry] = await db
        .select()
        .from(this.db.schema.trackingEntries)
        .where(
          and(
            eq(this.db.schema.trackingEntries.id, entryId),
            eq(this.db.schema.trackingEntries.userId, userId)
          )
        )
        .limit(1);
      return entry ?? null;
    });
  }

  async update(
    userId: string,
    entryId: string,
    data: Partial<Omit<NewTrackingEntry, 'userId'>>
  ): Promise<TrackingEntry | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.trackingEntries)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.trackingEntries.id, entryId),
            eq(this.db.schema.trackingEntries.userId, userId)
          )
        )
        .returning();
      return updated ?? null;
    });
  }

  async delete(userId: string, entryId: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .delete(this.db.schema.trackingEntries)
        .where(
          and(
            eq(this.db.schema.trackingEntries.id, entryId),
            eq(this.db.schema.trackingEntries.userId, userId)
          )
        )
        .returning();
      return !!deleted;
    });
  }

  async getAggregationByType(
    userId: string,
    type: string,
    startDate: Date,
    endDate: Date
  ): Promise<TrackingAggregation> {
    return this.db.withUserId(userId, async (db) => {
      // Get aggregations
      const [stats] = await db
        .select({
          average: sql<number>`AVG(${this.db.schema.trackingEntries.value}::numeric)`.mapWith(Number),
          sum: sql<number>`SUM(${this.db.schema.trackingEntries.value}::numeric)`.mapWith(Number),
          min: sql<number>`MIN(${this.db.schema.trackingEntries.value}::numeric)`.mapWith(Number),
          max: sql<number>`MAX(${this.db.schema.trackingEntries.value}::numeric)`.mapWith(Number),
          count: count(),
        })
        .from(this.db.schema.trackingEntries)
        .where(
          and(
            eq(this.db.schema.trackingEntries.userId, userId),
            eq(this.db.schema.trackingEntries.type, type as TrackingType),
            gte(this.db.schema.trackingEntries.entryDate, formatDateToString(startDate)),
            lte(this.db.schema.trackingEntries.entryDate, formatDateToString(endDate))
          )
        );

      // Get latest value
      const [latest] = await db
        .select({ value: this.db.schema.trackingEntries.value })
        .from(this.db.schema.trackingEntries)
        .where(
          and(
            eq(this.db.schema.trackingEntries.userId, userId),
            eq(this.db.schema.trackingEntries.type, type as TrackingType),
            gte(this.db.schema.trackingEntries.entryDate, formatDateToString(startDate)),
            lte(this.db.schema.trackingEntries.entryDate, formatDateToString(endDate))
          )
        )
        .orderBy(desc(this.db.schema.trackingEntries.entryDate), desc(this.db.schema.trackingEntries.createdAt))
        .limit(1);

      // Get previous value (second most recent)
      const [previous] = await db
        .select({ value: this.db.schema.trackingEntries.value })
        .from(this.db.schema.trackingEntries)
        .where(
          and(
            eq(this.db.schema.trackingEntries.userId, userId),
            eq(this.db.schema.trackingEntries.type, type as TrackingType),
            gte(this.db.schema.trackingEntries.entryDate, formatDateToString(startDate)),
            lte(this.db.schema.trackingEntries.entryDate, formatDateToString(endDate))
          )
        )
        .orderBy(desc(this.db.schema.trackingEntries.entryDate), desc(this.db.schema.trackingEntries.createdAt))
        .limit(1)
        .offset(1);

      const latestValue = latest?.value ? parseFloat(latest.value) : null;
      const previousValue = previous?.value ? parseFloat(previous.value) : null;

      // Calculate variation percentage
      let variation: number | null = null;
      if (latestValue !== null && previousValue !== null && previousValue !== 0) {
        variation = ((latestValue - previousValue) / previousValue) * 100;
      }

      return {
        type,
        average: stats?.average ?? null,
        sum: stats?.sum ?? null,
        min: stats?.min ?? null,
        max: stats?.max ?? null,
        count: stats?.count ?? 0,
        latestValue,
        previousValue,
        variation,
      };
    });
  }

  async getLatestByType(
    userId: string,
    types: TrackingType[]
  ): Promise<Map<TrackingType, TrackingEntry>> {
    const result = new Map<TrackingType, TrackingEntry>();

    if (types.length === 0) {
      return result;
    }

    await this.db.withUserId(userId, async (db) => {
      // For each type, get the latest entry
      for (const type of types) {
        const [entry] = await db
          .select()
          .from(this.db.schema.trackingEntries)
          .where(
            and(
              eq(this.db.schema.trackingEntries.userId, userId),
              eq(this.db.schema.trackingEntries.type, type)
            )
          )
          .orderBy(desc(this.db.schema.trackingEntries.entryDate), desc(this.db.schema.trackingEntries.createdAt))
          .limit(1);

        if (entry) {
          result.set(type, entry);
        }
      }
    });

    return result;
  }

  async countByType(userId: string): Promise<Record<TrackingType, number>> {
    return this.db.withUserId(userId, async (db) => {
      const results = await db
        .select({
          type: this.db.schema.trackingEntries.type,
          count: count(),
        })
        .from(this.db.schema.trackingEntries)
        .where(eq(this.db.schema.trackingEntries.userId, userId))
        .groupBy(this.db.schema.trackingEntries.type);

      // Initialize with zeros
      const counts = {} as Record<TrackingType, number>;

      // Fill in actual counts
      for (const row of results) {
        counts[row.type] = row.count;
      }

      return counts;
    });
  }
}
