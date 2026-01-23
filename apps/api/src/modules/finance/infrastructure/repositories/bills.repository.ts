// apps/api/src/modules/finance/infrastructure/repositories/bills.repository.ts

import { Injectable } from '@nestjs/common';
import { eq, and, sql, count } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { Bill, NewBill, BillStatus } from '@life-assistant/database';
import type {
  BillsRepositoryPort,
  BillSearchParams,
} from '../../domain/ports/bills.repository.port';

@Injectable()
export class BillsRepository implements BillsRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, data: Omit<NewBill, 'userId'>): Promise<Bill> {
    return this.db.withUserId(userId, async (db) => {
      const [bill] = await db
        .insert(this.db.schema.bills)
        .values({ ...data, userId })
        .returning();

      if (!bill) {
        throw new Error('Failed to create bill');
      }
      return bill;
    });
  }

  async findByUserId(
    userId: string,
    params: BillSearchParams
  ): Promise<Bill[]> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.bills.userId, userId)];

      if (params.monthYear) {
        conditions.push(eq(this.db.schema.bills.monthYear, params.monthYear));
      }
      if (params.category) {
        conditions.push(
          eq(this.db.schema.bills.category, params.category as Bill['category'])
        );
      }
      if (params.status) {
        conditions.push(
          eq(this.db.schema.bills.status, params.status as BillStatus)
        );
      }
      if (params.isRecurring !== undefined) {
        conditions.push(
          eq(this.db.schema.bills.isRecurring, params.isRecurring)
        );
      }

      return db
        .select()
        .from(this.db.schema.bills)
        .where(and(...conditions))
        .limit(params.limit ?? 50)
        .offset(params.offset ?? 0);
    });
  }

  async findById(userId: string, id: string): Promise<Bill | null> {
    return this.db.withUserId(userId, async (db) => {
      const [bill] = await db
        .select()
        .from(this.db.schema.bills)
        .where(
          and(
            eq(this.db.schema.bills.id, id),
            eq(this.db.schema.bills.userId, userId)
          )
        )
        .limit(1);

      return bill ?? null;
    });
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewBill, 'userId'>>
  ): Promise<Bill | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.bills)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(this.db.schema.bills.id, id),
            eq(this.db.schema.bills.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .delete(this.db.schema.bills)
        .where(
          and(
            eq(this.db.schema.bills.id, id),
            eq(this.db.schema.bills.userId, userId)
          )
        )
        .returning();

      return !!deleted;
    });
  }

  async countByUserId(
    userId: string,
    params: BillSearchParams
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.bills.userId, userId)];

      if (params.monthYear) {
        conditions.push(eq(this.db.schema.bills.monthYear, params.monthYear));
      }
      if (params.status) {
        conditions.push(
          eq(this.db.schema.bills.status, params.status as BillStatus)
        );
      }

      const [result] = await db
        .select({ count: count() })
        .from(this.db.schema.bills)
        .where(and(...conditions));

      return result?.count ?? 0;
    });
  }

  async markAsPaid(userId: string, id: string): Promise<Bill | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.bills)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.bills.id, id),
            eq(this.db.schema.bills.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async markAsUnpaid(userId: string, id: string): Promise<Bill | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.bills)
        .set({
          status: 'pending',
          paidAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.bills.id, id),
            eq(this.db.schema.bills.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async sumByMonthYear(userId: string, monthYear: string): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const [result] = await db
        .select({
          sum: sql<string>`COALESCE(SUM(${this.db.schema.bills.amount}), 0)`,
        })
        .from(this.db.schema.bills)
        .where(
          and(
            eq(this.db.schema.bills.userId, userId),
            eq(this.db.schema.bills.monthYear, monthYear)
          )
        );

      return parseFloat(result?.sum ?? '0');
    });
  }

  async sumByMonthYearAndStatus(
    userId: string,
    monthYear: string,
    status: string
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const [result] = await db
        .select({
          sum: sql<string>`COALESCE(SUM(${this.db.schema.bills.amount}), 0)`,
        })
        .from(this.db.schema.bills)
        .where(
          and(
            eq(this.db.schema.bills.userId, userId),
            eq(this.db.schema.bills.monthYear, monthYear),
            eq(this.db.schema.bills.status, status as BillStatus)
          )
        );

      return parseFloat(result?.sum ?? '0');
    });
  }

  async countByStatus(
    userId: string,
    monthYear: string
  ): Promise<Record<string, number>> {
    return this.db.withUserId(userId, async (db) => {
      const results = await db
        .select({
          status: this.db.schema.bills.status,
          count: count(),
        })
        .from(this.db.schema.bills)
        .where(
          and(
            eq(this.db.schema.bills.userId, userId),
            eq(this.db.schema.bills.monthYear, monthYear)
          )
        )
        .groupBy(this.db.schema.bills.status);

      const statusCounts: Record<string, number> = {
        pending: 0,
        paid: 0,
        overdue: 0,
        canceled: 0,
      };

      for (const result of results) {
        statusCounts[result.status] = result.count;
      }

      return statusCounts;
    });
  }
}
