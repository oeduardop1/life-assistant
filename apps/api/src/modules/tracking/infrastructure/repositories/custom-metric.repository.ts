import { Injectable } from '@nestjs/common';
import { eq, and, isNull, sql } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type {
  CustomMetricRepositoryPort,
  CustomMetricSearchParams,
} from '../../domain/ports/custom-metric.repository.port';
import type {
  CustomMetricDefinition,
  NewCustomMetricDefinition,
} from '@life-assistant/database';

/**
 * Drizzle implementation of CustomMetricRepositoryPort
 *
 * Uses RLS via withUserId for all operations
 * @see docs/specs/domains/tracking.md §4.2 for Custom Metrics spec
 */
@Injectable()
export class CustomMetricRepository implements CustomMetricRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    data: Omit<NewCustomMetricDefinition, 'userId'>
  ): Promise<CustomMetricDefinition> {
    return this.db.withUserId(userId, async (db) => {
      const [metric] = await db
        .insert(this.db.schema.customMetricDefinitions)
        .values({
          ...data,
          userId,
        })
        .returning();

      if (!metric) {
        throw new Error('Failed to create custom metric definition');
      }

      return metric;
    });
  }

  async findByUserId(
    userId: string,
    params: CustomMetricSearchParams
  ): Promise<CustomMetricDefinition[]> {
    const { isActive, includeDeleted = false, limit = 50, offset = 0 } = params;

    return this.db.withUserId(userId, async (db) => {
      const conditions = [
        eq(this.db.schema.customMetricDefinitions.userId, userId),
      ];

      // Only include non-deleted by default
      if (!includeDeleted) {
        conditions.push(isNull(this.db.schema.customMetricDefinitions.deletedAt));
      }

      if (isActive !== undefined) {
        conditions.push(eq(this.db.schema.customMetricDefinitions.isActive, isActive));
      }

      return db
        .select()
        .from(this.db.schema.customMetricDefinitions)
        .where(and(...conditions))
        .orderBy(this.db.schema.customMetricDefinitions.name)
        .limit(limit)
        .offset(offset);
    });
  }

  async findById(userId: string, metricId: string): Promise<CustomMetricDefinition | null> {
    return this.db.withUserId(userId, async (db) => {
      const [metric] = await db
        .select()
        .from(this.db.schema.customMetricDefinitions)
        .where(
          and(
            eq(this.db.schema.customMetricDefinitions.id, metricId),
            eq(this.db.schema.customMetricDefinitions.userId, userId),
            isNull(this.db.schema.customMetricDefinitions.deletedAt)
          )
        )
        .limit(1);
      return metric ?? null;
    });
  }

  async findByName(userId: string, name: string): Promise<CustomMetricDefinition | null> {
    return this.db.withUserId(userId, async (db) => {
      // Case-insensitive search using LOWER()
      const [metric] = await db
        .select()
        .from(this.db.schema.customMetricDefinitions)
        .where(
          and(
            eq(this.db.schema.customMetricDefinitions.userId, userId),
            sql`LOWER(${this.db.schema.customMetricDefinitions.name}) = LOWER(${name})`,
            isNull(this.db.schema.customMetricDefinitions.deletedAt)
          )
        )
        .limit(1);

      return metric ?? null;
    });
  }

  async update(
    userId: string,
    metricId: string,
    data: Partial<Omit<NewCustomMetricDefinition, 'userId'>>
  ): Promise<CustomMetricDefinition | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.customMetricDefinitions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.customMetricDefinitions.id, metricId),
            eq(this.db.schema.customMetricDefinitions.userId, userId),
            isNull(this.db.schema.customMetricDefinitions.deletedAt)
          )
        )
        .returning();
      return updated ?? null;
    });
  }

  async delete(userId: string, metricId: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      // Soft delete: set deletedAt timestamp
      const [deleted] = await db
        .update(this.db.schema.customMetricDefinitions)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.customMetricDefinitions.id, metricId),
            eq(this.db.schema.customMetricDefinitions.userId, userId),
            isNull(this.db.schema.customMetricDefinitions.deletedAt)
          )
        )
        .returning();
      return !!deleted;
    });
  }
}
