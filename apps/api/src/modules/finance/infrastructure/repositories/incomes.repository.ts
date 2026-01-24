// apps/api/src/modules/finance/infrastructure/repositories/incomes.repository.ts

import { Injectable } from '@nestjs/common';
import { eq, and, sql, count, gt, isNotNull } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { Income, NewIncome } from '@life-assistant/database';
import type {
  IncomesRepositoryPort,
  IncomeSearchParams,
} from '../../domain/ports/incomes.repository.port';

@Injectable()
export class IncomesRepository implements IncomesRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    data: Omit<NewIncome, 'userId'>
  ): Promise<Income> {
    return this.db.withUserId(userId, async (db) => {
      const [income] = await db
        .insert(this.db.schema.incomes)
        .values({ ...data, userId })
        .returning();

      if (!income) {
        throw new Error('Failed to create income');
      }
      return income;
    });
  }

  async findByUserId(
    userId: string,
    params: IncomeSearchParams
  ): Promise<Income[]> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.incomes.userId, userId)];

      if (params.monthYear) {
        conditions.push(
          eq(this.db.schema.incomes.monthYear, params.monthYear)
        );
      }
      if (params.type) {
        conditions.push(
          eq(this.db.schema.incomes.type, params.type as Income['type'])
        );
      }
      if (params.isRecurring !== undefined) {
        conditions.push(
          eq(this.db.schema.incomes.isRecurring, params.isRecurring)
        );
      }

      return db
        .select()
        .from(this.db.schema.incomes)
        .where(and(...conditions))
        .limit(params.limit ?? 50)
        .offset(params.offset ?? 0);
    });
  }

  async findById(userId: string, id: string): Promise<Income | null> {
    return this.db.withUserId(userId, async (db) => {
      const [income] = await db
        .select()
        .from(this.db.schema.incomes)
        .where(
          and(
            eq(this.db.schema.incomes.id, id),
            eq(this.db.schema.incomes.userId, userId)
          )
        )
        .limit(1);

      return income ?? null;
    });
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewIncome, 'userId'>>
  ): Promise<Income | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.incomes)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(this.db.schema.incomes.id, id),
            eq(this.db.schema.incomes.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .delete(this.db.schema.incomes)
        .where(
          and(
            eq(this.db.schema.incomes.id, id),
            eq(this.db.schema.incomes.userId, userId)
          )
        )
        .returning();

      return !!deleted;
    });
  }

  async countByUserId(
    userId: string,
    params: IncomeSearchParams
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.incomes.userId, userId)];

      if (params.monthYear) {
        conditions.push(
          eq(this.db.schema.incomes.monthYear, params.monthYear)
        );
      }
      if (params.type) {
        conditions.push(
          eq(this.db.schema.incomes.type, params.type as Income['type'])
        );
      }

      const [result] = await db
        .select({ count: count() })
        .from(this.db.schema.incomes)
        .where(and(...conditions));

      return result?.count ?? 0;
    });
  }

  async sumByMonthYear(
    userId: string,
    monthYear: string,
    field: 'expectedAmount' | 'actualAmount'
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const column =
        field === 'expectedAmount'
          ? this.db.schema.incomes.expectedAmount
          : this.db.schema.incomes.actualAmount;

      const [result] = await db
        .select({
          sum: sql<string>`COALESCE(SUM(${column}), 0)`,
        })
        .from(this.db.schema.incomes)
        .where(
          and(
            eq(this.db.schema.incomes.userId, userId),
            eq(this.db.schema.incomes.monthYear, monthYear)
          )
        );

      return parseFloat(result?.sum ?? '0');
    });
  }

  // =========================================================================
  // Recurring Methods
  // =========================================================================

  async findRecurringByMonth(
    userId: string,
    monthYear: string
  ): Promise<Income[]> {
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.incomes)
        .where(
          and(
            eq(this.db.schema.incomes.userId, userId),
            eq(this.db.schema.incomes.monthYear, monthYear),
            eq(this.db.schema.incomes.isRecurring, true),
            isNotNull(this.db.schema.incomes.recurringGroupId)
          )
        );
    });
  }

  async findByRecurringGroupIdAndMonth(
    userId: string,
    recurringGroupId: string,
    monthYear: string
  ): Promise<Income | null> {
    return this.db.withUserId(userId, async (db) => {
      const [income] = await db
        .select()
        .from(this.db.schema.incomes)
        .where(
          and(
            eq(this.db.schema.incomes.userId, userId),
            eq(this.db.schema.incomes.recurringGroupId, recurringGroupId),
            eq(this.db.schema.incomes.monthYear, monthYear)
          )
        )
        .limit(1);

      return income ?? null;
    });
  }

  async findByRecurringGroupId(
    userId: string,
    recurringGroupId: string
  ): Promise<Income[]> {
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.incomes)
        .where(
          and(
            eq(this.db.schema.incomes.userId, userId),
            eq(this.db.schema.incomes.recurringGroupId, recurringGroupId)
          )
        );
    });
  }

  async createMany(
    userId: string,
    data: Omit<NewIncome, 'userId'>[]
  ): Promise<Income[]> {
    if (data.length === 0) return [];

    return this.db.withUserId(userId, async (db) => {
      const values = data.map((item) => ({ ...item, userId }));
      return db
        .insert(this.db.schema.incomes)
        .values(values)
        .onConflictDoNothing({
          target: [
            this.db.schema.incomes.userId,
            this.db.schema.incomes.recurringGroupId,
            this.db.schema.incomes.monthYear,
          ],
        })
        .returning();
    });
  }

  async updateByRecurringGroupIdAfterMonth(
    userId: string,
    recurringGroupId: string,
    afterMonthYear: string,
    data: Partial<Omit<NewIncome, 'userId'>>
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const result = await db
        .update(this.db.schema.incomes)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(this.db.schema.incomes.userId, userId),
            eq(this.db.schema.incomes.recurringGroupId, recurringGroupId),
            gt(this.db.schema.incomes.monthYear, afterMonthYear)
          )
        )
        .returning();

      return result.length;
    });
  }

  async deleteByRecurringGroupIdAfterMonth(
    userId: string,
    recurringGroupId: string,
    afterMonthYear: string
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const result = await db
        .delete(this.db.schema.incomes)
        .where(
          and(
            eq(this.db.schema.incomes.userId, userId),
            eq(this.db.schema.incomes.recurringGroupId, recurringGroupId),
            gt(this.db.schema.incomes.monthYear, afterMonthYear)
          )
        )
        .returning();

      return result.length;
    });
  }

  async deleteByRecurringGroupId(
    userId: string,
    recurringGroupId: string
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const result = await db
        .delete(this.db.schema.incomes)
        .where(
          and(
            eq(this.db.schema.incomes.userId, userId),
            eq(this.db.schema.incomes.recurringGroupId, recurringGroupId)
          )
        )
        .returning();

      return result.length;
    });
  }
}
