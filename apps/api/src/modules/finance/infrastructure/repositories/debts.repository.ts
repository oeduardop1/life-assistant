// apps/api/src/modules/finance/infrastructure/repositories/debts.repository.ts

import { Injectable } from '@nestjs/common';
import { eq, and, count } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { Debt, NewDebt, DebtStatus } from '@life-assistant/database';
import type {
  DebtsRepositoryPort,
  DebtSearchParams,
  DebtSummary,
} from '../../domain/ports/debts.repository.port';

@Injectable()
export class DebtsRepository implements DebtsRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, data: Omit<NewDebt, 'userId'>): Promise<Debt> {
    return this.db.withUserId(userId, async (db) => {
      const [debt] = await db
        .insert(this.db.schema.debts)
        .values({ ...data, userId })
        .returning();

      if (!debt) {
        throw new Error('Failed to create debt');
      }
      return debt;
    });
  }

  async findByUserId(
    userId: string,
    params: DebtSearchParams
  ): Promise<Debt[]> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.debts.userId, userId)];

      if (params.status) {
        conditions.push(
          eq(this.db.schema.debts.status, params.status as DebtStatus)
        );
      }
      if (params.isNegotiated !== undefined) {
        conditions.push(
          eq(this.db.schema.debts.isNegotiated, params.isNegotiated)
        );
      }

      return db
        .select()
        .from(this.db.schema.debts)
        .where(and(...conditions))
        .limit(params.limit ?? 50)
        .offset(params.offset ?? 0);
    });
  }

  async findById(userId: string, id: string): Promise<Debt | null> {
    return this.db.withUserId(userId, async (db) => {
      const [debt] = await db
        .select()
        .from(this.db.schema.debts)
        .where(
          and(
            eq(this.db.schema.debts.id, id),
            eq(this.db.schema.debts.userId, userId)
          )
        )
        .limit(1);

      return debt ?? null;
    });
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewDebt, 'userId'>>
  ): Promise<Debt | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.debts)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(this.db.schema.debts.id, id),
            eq(this.db.schema.debts.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .delete(this.db.schema.debts)
        .where(
          and(
            eq(this.db.schema.debts.id, id),
            eq(this.db.schema.debts.userId, userId)
          )
        )
        .returning();

      return !!deleted;
    });
  }

  async countByUserId(
    userId: string,
    params: DebtSearchParams
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.debts.userId, userId)];

      if (params.status) {
        conditions.push(
          eq(this.db.schema.debts.status, params.status as DebtStatus)
        );
      }
      if (params.isNegotiated !== undefined) {
        conditions.push(
          eq(this.db.schema.debts.isNegotiated, params.isNegotiated)
        );
      }

      const [result] = await db
        .select({ count: count() })
        .from(this.db.schema.debts)
        .where(and(...conditions));

      return result?.count ?? 0;
    });
  }

  async payInstallment(userId: string, id: string): Promise<Debt | null> {
    return this.db.withUserId(userId, async (db) => {
      // First, get the current debt to check installment status
      const [currentDebt] = await db
        .select()
        .from(this.db.schema.debts)
        .where(
          and(
            eq(this.db.schema.debts.id, id),
            eq(this.db.schema.debts.userId, userId)
          )
        )
        .limit(1);

      if (!currentDebt?.isNegotiated) {
        return null;
      }

      const newInstallment = currentDebt.currentInstallment + 1;
      const totalInstallments = currentDebt.totalInstallments ?? 0;

      // Check if debt is fully paid
      const newStatus: DebtStatus =
        newInstallment > totalInstallments ? 'paid_off' : 'active';

      const [updated] = await db
        .update(this.db.schema.debts)
        .set({
          currentInstallment: newInstallment,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.debts.id, id),
            eq(this.db.schema.debts.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async negotiate(
    userId: string,
    id: string,
    data: {
      totalInstallments: number;
      installmentAmount: number;
      dueDay: number;
    }
  ): Promise<Debt | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.debts)
        .set({
          isNegotiated: true,
          totalInstallments: data.totalInstallments,
          installmentAmount: data.installmentAmount.toString(),
          dueDay: data.dueDay,
          currentInstallment: 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.debts.id, id),
            eq(this.db.schema.debts.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    });
  }

  async getSummary(userId: string): Promise<DebtSummary> {
    return this.db.withUserId(userId, async (db) => {
      const debts = await db
        .select()
        .from(this.db.schema.debts)
        .where(eq(this.db.schema.debts.userId, userId));

      let totalAmount = 0;
      let totalPaid = 0;
      let negotiatedCount = 0;
      let monthlyInstallmentSum = 0;

      for (const debt of debts) {
        totalAmount += parseFloat(debt.totalAmount);

        if (debt.isNegotiated && debt.installmentAmount) {
          negotiatedCount++;
          const paidInstallments = debt.currentInstallment - 1;
          totalPaid += paidInstallments * parseFloat(debt.installmentAmount);

          if (debt.status === 'active') {
            monthlyInstallmentSum += parseFloat(debt.installmentAmount);
          }
        }
      }

      return {
        totalDebts: debts.length,
        totalAmount,
        totalPaid,
        totalRemaining: totalAmount - totalPaid,
        negotiatedCount,
        monthlyInstallmentSum,
      };
    });
  }
}
