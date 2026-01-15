import { Injectable } from '@nestjs/common';
import { eq, and, isNull, isNotNull, desc, or, ilike, count, gte, lte } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type {
  KnowledgeItemRepositoryPort,
  KnowledgeItemSearchParams,
} from '../../domain/ports/knowledge-item.repository.port';
import type {
  KnowledgeItem,
  NewKnowledgeItem,
  KnowledgeItemType,
  LifeArea,
} from '@life-assistant/database';

// Life area values for iteration
const LIFE_AREAS: LifeArea[] = [
  'health',
  'financial',
  'relationships',
  'career',
  'personal_growth',
  'leisure',
  'spirituality',
  'mental_health',
];

// Knowledge item type values for iteration
const KNOWLEDGE_ITEM_TYPES: KnowledgeItemType[] = [
  'fact',
  'preference',
  'memory',
  'insight',
  'person',
];

/**
 * Drizzle implementation of KnowledgeItemRepositoryPort
 *
 * Uses RLS via withUserId for all operations
 * @see DATA_MODEL.md §4.5 for knowledge_items entity
 */
@Injectable()
export class KnowledgeItemRepository implements KnowledgeItemRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async search(
    userId: string,
    params: KnowledgeItemSearchParams
  ): Promise<KnowledgeItem[]> {
    const {
      query,
      type,
      area,
      source,
      confidenceMin,
      confidenceMax,
      dateFrom,
      dateTo,
      limit = 20,
      offset = 0,
      includeDeleted = false,
      includeSuperseded = false,
    } = params;

    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.knowledgeItems.userId, userId)];

      if (!includeDeleted) {
        conditions.push(isNull(this.db.schema.knowledgeItems.deletedAt));
      }

      // Filter out superseded items by default (M1.6.1)
      if (!includeSuperseded) {
        conditions.push(isNull(this.db.schema.knowledgeItems.supersededById));
      }

      if (type) {
        conditions.push(eq(this.db.schema.knowledgeItems.type, type));
      }

      if (area) {
        conditions.push(eq(this.db.schema.knowledgeItems.area, area));
      }

      if (source) {
        conditions.push(eq(this.db.schema.knowledgeItems.source, source));
      }

      if (confidenceMin !== undefined) {
        conditions.push(gte(this.db.schema.knowledgeItems.confidence, confidenceMin));
      }

      if (confidenceMax !== undefined) {
        conditions.push(lte(this.db.schema.knowledgeItems.confidence, confidenceMax));
      }

      if (dateFrom) {
        conditions.push(gte(this.db.schema.knowledgeItems.createdAt, dateFrom));
      }

      if (dateTo) {
        conditions.push(lte(this.db.schema.knowledgeItems.createdAt, dateTo));
      }

      if (query) {
        // Full-text search on title and content
        const orCondition = or(
          ilike(this.db.schema.knowledgeItems.title, `%${query}%`),
          ilike(this.db.schema.knowledgeItems.content, `%${query}%`)
        );
        if (orCondition) {
          conditions.push(orCondition);
        }
      }

      return db
        .select()
        .from(this.db.schema.knowledgeItems)
        .where(and(...conditions))
        .orderBy(desc(this.db.schema.knowledgeItems.createdAt))
        .limit(limit)
        .offset(offset);
    });
  }

  async countSearch(
    userId: string,
    params: Omit<KnowledgeItemSearchParams, 'limit' | 'offset'>
  ): Promise<number> {
    const {
      query,
      type,
      area,
      source,
      confidenceMin,
      confidenceMax,
      dateFrom,
      dateTo,
      includeDeleted = false,
      includeSuperseded = false,
    } = params;

    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.knowledgeItems.userId, userId)];

      if (!includeDeleted) {
        conditions.push(isNull(this.db.schema.knowledgeItems.deletedAt));
      }

      // Filter out superseded items by default (M1.6.1)
      if (!includeSuperseded) {
        conditions.push(isNull(this.db.schema.knowledgeItems.supersededById));
      }

      if (type) {
        conditions.push(eq(this.db.schema.knowledgeItems.type, type));
      }

      if (area) {
        conditions.push(eq(this.db.schema.knowledgeItems.area, area));
      }

      if (source) {
        conditions.push(eq(this.db.schema.knowledgeItems.source, source));
      }

      if (confidenceMin !== undefined) {
        conditions.push(gte(this.db.schema.knowledgeItems.confidence, confidenceMin));
      }

      if (confidenceMax !== undefined) {
        conditions.push(lte(this.db.schema.knowledgeItems.confidence, confidenceMax));
      }

      if (dateFrom) {
        conditions.push(gte(this.db.schema.knowledgeItems.createdAt, dateFrom));
      }

      if (dateTo) {
        conditions.push(lte(this.db.schema.knowledgeItems.createdAt, dateTo));
      }

      if (query) {
        const orCondition = or(
          ilike(this.db.schema.knowledgeItems.title, `%${query}%`),
          ilike(this.db.schema.knowledgeItems.content, `%${query}%`)
        );
        if (orCondition) {
          conditions.push(orCondition);
        }
      }

      const [result] = await db
        .select({ count: count() })
        .from(this.db.schema.knowledgeItems)
        .where(and(...conditions));

      return result?.count ?? 0;
    });
  }

  async findById(userId: string, itemId: string): Promise<KnowledgeItem | null> {
    return this.db.withUserId(userId, async (db) => {
      const [item] = await db
        .select()
        .from(this.db.schema.knowledgeItems)
        .where(
          and(
            eq(this.db.schema.knowledgeItems.id, itemId),
            eq(this.db.schema.knowledgeItems.userId, userId),
            isNull(this.db.schema.knowledgeItems.deletedAt)
          )
        )
        .limit(1);
      return item ?? null;
    });
  }

  async create(
    userId: string,
    data: Omit<NewKnowledgeItem, 'userId'>
  ): Promise<KnowledgeItem> {
    return this.db.withUserId(userId, async (db) => {
      const [item] = await db
        .insert(this.db.schema.knowledgeItems)
        .values({
          ...data,
          userId,
        })
        .returning();

      if (!item) {
        throw new Error('Failed to create knowledge item');
      }

      return item;
    });
  }

  async createMany(
    userId: string,
    items: Omit<NewKnowledgeItem, 'userId'>[]
  ): Promise<KnowledgeItem[]> {
    if (items.length === 0) {
      return [];
    }

    return this.db.withUserId(userId, async (db) => {
      const itemsWithUserId = items.map((item) => ({
        ...item,
        userId,
      }));

      return db
        .insert(this.db.schema.knowledgeItems)
        .values(itemsWithUserId)
        .returning();
    });
  }

  async update(
    userId: string,
    itemId: string,
    data: Partial<Pick<KnowledgeItem, 'content' | 'title' | 'confidence' | 'validatedByUser' | 'tags' | 'relatedItems'>>
  ): Promise<KnowledgeItem | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.knowledgeItems)
        .set({
          ...data,
          // updatedAt is handled by database trigger
        })
        .where(
          and(
            eq(this.db.schema.knowledgeItems.id, itemId),
            eq(this.db.schema.knowledgeItems.userId, userId),
            isNull(this.db.schema.knowledgeItems.deletedAt)
          )
        )
        .returning();
      return updated ?? null;
    });
  }

  async softDelete(userId: string, itemId: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .update(this.db.schema.knowledgeItems)
        .set({
          deletedAt: new Date(),
          // updatedAt is handled by database trigger
        })
        .where(
          and(
            eq(this.db.schema.knowledgeItems.id, itemId),
            eq(this.db.schema.knowledgeItems.userId, userId),
            isNull(this.db.schema.knowledgeItems.deletedAt)
          )
        )
        .returning();
      return !!deleted;
    });
  }

  async findByType(
    userId: string,
    type: KnowledgeItemType,
    limit = 50
  ): Promise<KnowledgeItem[]> {
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.knowledgeItems)
        .where(
          and(
            eq(this.db.schema.knowledgeItems.userId, userId),
            eq(this.db.schema.knowledgeItems.type, type),
            isNull(this.db.schema.knowledgeItems.deletedAt),
            isNull(this.db.schema.knowledgeItems.supersededById)
          )
        )
        .orderBy(desc(this.db.schema.knowledgeItems.createdAt))
        .limit(limit);
    });
  }

  async findByArea(
    userId: string,
    area: LifeArea,
    limit = 50
  ): Promise<KnowledgeItem[]> {
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.knowledgeItems)
        .where(
          and(
            eq(this.db.schema.knowledgeItems.userId, userId),
            eq(this.db.schema.knowledgeItems.area, area),
            isNull(this.db.schema.knowledgeItems.deletedAt),
            isNull(this.db.schema.knowledgeItems.supersededById)
          )
        )
        .orderBy(desc(this.db.schema.knowledgeItems.createdAt))
        .limit(limit);
    });
  }

  async countByArea(userId: string): Promise<Record<LifeArea, number>> {
    return this.db.withUserId(userId, async (db) => {
      const results = await db
        .select({
          area: this.db.schema.knowledgeItems.area,
          count: count(),
        })
        .from(this.db.schema.knowledgeItems)
        .where(
          and(
            eq(this.db.schema.knowledgeItems.userId, userId),
            isNull(this.db.schema.knowledgeItems.deletedAt),
            isNull(this.db.schema.knowledgeItems.supersededById)
          )
        )
        .groupBy(this.db.schema.knowledgeItems.area);

      // Initialize all areas with 0
      const counts = {} as Record<LifeArea, number>;
      for (const area of LIFE_AREAS) {
        counts[area] = 0;
      }

      // Fill in actual counts
      for (const row of results) {
        if (row.area) {
          counts[row.area] = row.count;
        }
      }

      return counts;
    });
  }

  async countByType(userId: string): Promise<Record<KnowledgeItemType, number>> {
    return this.db.withUserId(userId, async (db) => {
      const results = await db
        .select({
          type: this.db.schema.knowledgeItems.type,
          count: count(),
        })
        .from(this.db.schema.knowledgeItems)
        .where(
          and(
            eq(this.db.schema.knowledgeItems.userId, userId),
            isNull(this.db.schema.knowledgeItems.deletedAt),
            isNull(this.db.schema.knowledgeItems.supersededById)
          )
        )
        .groupBy(this.db.schema.knowledgeItems.type);

      // Initialize all types with 0
      const counts = {} as Record<KnowledgeItemType, number>;
      for (const type of KNOWLEDGE_ITEM_TYPES) {
        counts[type] = 0;
      }

      // Fill in actual counts
      for (const row of results) {
        counts[row.type] = row.count;
      }

      return counts;
    });
  }

  async findAll(userId: string): Promise<KnowledgeItem[]> {
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.knowledgeItems)
        .where(
          and(
            eq(this.db.schema.knowledgeItems.userId, userId),
            isNull(this.db.schema.knowledgeItems.deletedAt),
            isNull(this.db.schema.knowledgeItems.supersededById)
          )
        )
        .orderBy(desc(this.db.schema.knowledgeItems.createdAt));
    });
  }

  // =========================================================================
  // Contradiction Detection Methods
  // =========================================================================

  async findActiveBySameScope(
    userId: string,
    type: KnowledgeItemType,
    area?: LifeArea | null,
    limit = 20
  ): Promise<KnowledgeItem[]> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [
        eq(this.db.schema.knowledgeItems.userId, userId),
        eq(this.db.schema.knowledgeItems.type, type),
        isNull(this.db.schema.knowledgeItems.supersededById),
        isNull(this.db.schema.knowledgeItems.deletedAt),
      ];

      if (area) {
        conditions.push(eq(this.db.schema.knowledgeItems.area, area));
      }

      return db
        .select()
        .from(this.db.schema.knowledgeItems)
        .where(and(...conditions))
        .orderBy(desc(this.db.schema.knowledgeItems.createdAt))
        .limit(limit);
    });
  }

  async supersede(
    userId: string,
    itemId: string,
    supersededById: string
  ): Promise<KnowledgeItem | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.knowledgeItems)
        .set({
          supersededById,
          supersededAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.knowledgeItems.id, itemId),
            eq(this.db.schema.knowledgeItems.userId, userId),
            isNull(this.db.schema.knowledgeItems.supersededById)
          )
        )
        .returning();
      return updated ?? null;
    });
  }

  async findSuperseded(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<KnowledgeItem[]> {
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.knowledgeItems)
        .where(
          and(
            eq(this.db.schema.knowledgeItems.userId, userId),
            // supersededById is NOT null - meaning this item was superseded
            isNotNull(this.db.schema.knowledgeItems.supersededById),
            isNull(this.db.schema.knowledgeItems.deletedAt)
          )
        )
        .orderBy(desc(this.db.schema.knowledgeItems.supersededAt))
        .limit(limit)
        .offset(offset);
    });
  }
}
