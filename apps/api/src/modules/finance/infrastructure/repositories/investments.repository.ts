// apps/api/src/modules/finance/infrastructure/repositories/investments.repository.ts

import { Injectable } from '@nestjs/common';
import { eq, and, count } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { Investment, NewInvestment } from '@life-assistant/database';
import type {
  InvestmentsRepositoryPort,
  InvestmentSearchParams,
  InvestmentSummary,
} from '../../domain/ports/investments.repository.port';

@Injectable()
export class InvestmentsRepository implements InvestmentsRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    data: Omit<NewInvestment, 'userId'>
  ): Promise<Investment> {
    return this.db.withUserId(userId, async (db) => {
      const [investment] = await db
        .insert(this.db.schema.investments)
        .values({ ...data, userId })
        .returning();

      if (!investment) {
        throw new Error('Failed to create investment');
      }
      return investment;
    });
  }

  async findByUserId(
    userId: string,
    params: InvestmentSearchParams
  ): Promise<Investment[]> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.investments.userId, userId)];

      if (params.type) {
        conditions.push(
          eq(
            this.db.schema.investments.type,
            params.type as Investment['type']
          )
        );
      }

      return db
        .select()
        .from(this.db.schema.investments)
        .where(and(...conditions))
        .limit(params.limit ?? 50)
        .offset(params.offset ?? 0);
    });
  }

  async findById(userId: string, id: string): Promise<Investment | null> {
    return this.db.withUserId(userId, async (db) => {
      const [investment] = await db
        .select()
        .from(this.db.schema.investments)
        .where(
          and(
            eq(this.db.schema.investments.id, id),
            eq(this.db.schema.investments.userId, userId)
          )
        )
        .limit(1);

      return investment ?? null;
    });
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewInvestment, 'userId'>>
  ): Promise<Investment | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.investments)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(this.db.schema.investments.id, id),
            eq(this.db.schema.investments.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .delete(this.db.schema.investments)
        .where(
          and(
            eq(this.db.schema.investments.id, id),
            eq(this.db.schema.investments.userId, userId)
          )
        )
        .returning();

      return !!deleted;
    });
  }

  async countByUserId(
    userId: string,
    params: InvestmentSearchParams
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.investments.userId, userId)];

      if (params.type) {
        conditions.push(
          eq(
            this.db.schema.investments.type,
            params.type as Investment['type']
          )
        );
      }

      const [result] = await db
        .select({ count: count() })
        .from(this.db.schema.investments)
        .where(and(...conditions));

      return result?.count ?? 0;
    });
  }

  async updateValue(
    userId: string,
    id: string,
    currentAmount: number
  ): Promise<Investment | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.investments)
        .set({
          currentAmount: currentAmount.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.investments.id, id),
            eq(this.db.schema.investments.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async getSummary(userId: string): Promise<InvestmentSummary> {
    return this.db.withUserId(userId, async (db) => {
      const investments = await db
        .select()
        .from(this.db.schema.investments)
        .where(eq(this.db.schema.investments.userId, userId));

      let totalCurrentAmount = 0;
      let totalGoalAmount = 0;
      let totalMonthlyContribution = 0;
      let progressSum = 0;
      let progressCount = 0;

      for (const inv of investments) {
        totalCurrentAmount += parseFloat(inv.currentAmount);

        if (inv.goalAmount) {
          totalGoalAmount += parseFloat(inv.goalAmount);
          const progress =
            (parseFloat(inv.currentAmount) / parseFloat(inv.goalAmount)) * 100;
          progressSum += progress;
          progressCount++;
        }

        if (inv.monthlyContribution) {
          totalMonthlyContribution += parseFloat(inv.monthlyContribution);
        }
      }

      return {
        totalInvestments: investments.length,
        totalCurrentAmount,
        totalGoalAmount,
        totalMonthlyContribution,
        averageProgress: progressCount > 0 ? progressSum / progressCount : 0,
      };
    });
  }
}
