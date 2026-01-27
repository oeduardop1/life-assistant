// apps/api/src/modules/finance/infrastructure/repositories/variable-expenses.repository.ts

import { Injectable } from '@nestjs/common';
import { eq, and, sql, count, gt, isNotNull, ne } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { VariableExpense, NewVariableExpense } from '@life-assistant/database';
import type {
  VariableExpensesRepositoryPort,
  VariableExpenseSearchParams,
} from '../../domain/ports/variable-expenses.repository.port';

@Injectable()
export class VariableExpensesRepository
  implements VariableExpensesRepositoryPort
{
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    data: Omit<NewVariableExpense, 'userId'>
  ): Promise<VariableExpense> {
    return this.db.withUserId(userId, async (db) => {
      const [expense] = await db
        .insert(this.db.schema.variableExpenses)
        .values({ ...data, userId })
        .returning();

      if (!expense) {
        throw new Error('Failed to create variable expense');
      }
      return expense;
    });
  }

  async findByUserId(
    userId: string,
    params: VariableExpenseSearchParams
  ): Promise<VariableExpense[]> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [
        eq(this.db.schema.variableExpenses.userId, userId),
        ne(this.db.schema.variableExpenses.status, 'excluded'),
      ];

      if (params.monthYear) {
        conditions.push(
          eq(this.db.schema.variableExpenses.monthYear, params.monthYear)
        );
      }
      if (params.category) {
        conditions.push(
          eq(
            this.db.schema.variableExpenses.category,
            params.category as VariableExpense['category']
          )
        );
      }
      if (params.isRecurring !== undefined) {
        conditions.push(
          eq(this.db.schema.variableExpenses.isRecurring, params.isRecurring)
        );
      }

      return db
        .select()
        .from(this.db.schema.variableExpenses)
        .where(and(...conditions))
        .limit(params.limit ?? 50)
        .offset(params.offset ?? 0);
    });
  }

  async findById(
    userId: string,
    id: string
  ): Promise<VariableExpense | null> {
    return this.db.withUserId(userId, async (db) => {
      const [expense] = await db
        .select()
        .from(this.db.schema.variableExpenses)
        .where(
          and(
            eq(this.db.schema.variableExpenses.id, id),
            eq(this.db.schema.variableExpenses.userId, userId)
          )
        )
        .limit(1);

      return expense ?? null;
    });
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewVariableExpense, 'userId'>>
  ): Promise<VariableExpense | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.variableExpenses)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(this.db.schema.variableExpenses.id, id),
            eq(this.db.schema.variableExpenses.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .delete(this.db.schema.variableExpenses)
        .where(
          and(
            eq(this.db.schema.variableExpenses.id, id),
            eq(this.db.schema.variableExpenses.userId, userId)
          )
        )
        .returning();

      return !!deleted;
    });
  }

  async countByUserId(
    userId: string,
    params: VariableExpenseSearchParams
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [
        eq(this.db.schema.variableExpenses.userId, userId),
        ne(this.db.schema.variableExpenses.status, 'excluded'),
      ];

      if (params.monthYear) {
        conditions.push(
          eq(this.db.schema.variableExpenses.monthYear, params.monthYear)
        );
      }
      if (params.category) {
        conditions.push(
          eq(
            this.db.schema.variableExpenses.category,
            params.category as VariableExpense['category']
          )
        );
      }

      const [result] = await db
        .select({ count: count() })
        .from(this.db.schema.variableExpenses)
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
          ? this.db.schema.variableExpenses.expectedAmount
          : this.db.schema.variableExpenses.actualAmount;

      const [result] = await db
        .select({
          sum: sql<string>`COALESCE(SUM(${column}), 0)`,
        })
        .from(this.db.schema.variableExpenses)
        .where(
          and(
            eq(this.db.schema.variableExpenses.userId, userId),
            eq(this.db.schema.variableExpenses.monthYear, monthYear),
            ne(this.db.schema.variableExpenses.status, 'excluded')
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
  ): Promise<VariableExpense[]> {
    // NOTE: Do NOT filter by status here!
    // Excluded items must still propagate to create future months.
    // The 'excluded' status only hides the item from display, not from recurrence chain.
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.variableExpenses)
        .where(
          and(
            eq(this.db.schema.variableExpenses.userId, userId),
            eq(this.db.schema.variableExpenses.monthYear, monthYear),
            eq(this.db.schema.variableExpenses.isRecurring, true),
            isNotNull(this.db.schema.variableExpenses.recurringGroupId)
          )
        );
    });
  }

  async findByRecurringGroupIdAndMonth(
    userId: string,
    recurringGroupId: string,
    monthYear: string
  ): Promise<VariableExpense | null> {
    return this.db.withUserId(userId, async (db) => {
      const [expense] = await db
        .select()
        .from(this.db.schema.variableExpenses)
        .where(
          and(
            eq(this.db.schema.variableExpenses.userId, userId),
            eq(this.db.schema.variableExpenses.recurringGroupId, recurringGroupId),
            eq(this.db.schema.variableExpenses.monthYear, monthYear)
          )
        )
        .limit(1);

      return expense ?? null;
    });
  }

  async findByRecurringGroupId(
    userId: string,
    recurringGroupId: string
  ): Promise<VariableExpense[]> {
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.variableExpenses)
        .where(
          and(
            eq(this.db.schema.variableExpenses.userId, userId),
            eq(this.db.schema.variableExpenses.recurringGroupId, recurringGroupId)
          )
        );
    });
  }

  async createMany(
    userId: string,
    data: Omit<NewVariableExpense, 'userId'>[]
  ): Promise<VariableExpense[]> {
    if (data.length === 0) return [];

    return this.db.withUserId(userId, async (db) => {
      const values = data.map((item) => ({ ...item, userId }));
      return db
        .insert(this.db.schema.variableExpenses)
        .values(values)
        .onConflictDoNothing({
          target: [
            this.db.schema.variableExpenses.userId,
            this.db.schema.variableExpenses.recurringGroupId,
            this.db.schema.variableExpenses.monthYear,
          ],
        })
        .returning();
    });
  }

  async updateByRecurringGroupIdAfterMonth(
    userId: string,
    recurringGroupId: string,
    afterMonthYear: string,
    data: Partial<Omit<NewVariableExpense, 'userId'>>
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const result = await db
        .update(this.db.schema.variableExpenses)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(this.db.schema.variableExpenses.userId, userId),
            eq(this.db.schema.variableExpenses.recurringGroupId, recurringGroupId),
            gt(this.db.schema.variableExpenses.monthYear, afterMonthYear)
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
        .delete(this.db.schema.variableExpenses)
        .where(
          and(
            eq(this.db.schema.variableExpenses.userId, userId),
            eq(this.db.schema.variableExpenses.recurringGroupId, recurringGroupId),
            gt(this.db.schema.variableExpenses.monthYear, afterMonthYear)
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
        .delete(this.db.schema.variableExpenses)
        .where(
          and(
            eq(this.db.schema.variableExpenses.userId, userId),
            eq(this.db.schema.variableExpenses.recurringGroupId, recurringGroupId)
          )
        )
        .returning();

      return result.length;
    });
  }
}
