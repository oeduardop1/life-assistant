// apps/api/src/modules/finance/infrastructure/repositories/incomes.repository.ts

import { Injectable } from '@nestjs/common';
import { eq, and, sql, count } from '@life-assistant/database';
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
}
