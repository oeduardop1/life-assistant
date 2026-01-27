// apps/api/src/modules/finance/infrastructure/repositories/debts.repository.ts

import { Injectable } from '@nestjs/common';
import { eq, and, count, sql } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { Debt, NewDebt, DebtPayment, DebtStatus } from '@life-assistant/database';
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

      let debts = await db
        .select()
        .from(this.db.schema.debts)
        .where(and(...conditions))
        .limit(params.limit ?? 50)
        .offset(params.offset ?? 0);

      // Apply month filtering if monthYear is provided
      if (params.monthYear) {
        debts = this.filterDebtsByMonth(debts, params.monthYear);
      }

      return debts;
    });
  }

  /**
   * Filter debts by month based on visibility rules:
   * - Non-negotiated debts: always visible
   * - Defaulted debts: always visible (alert)
   * - Paid off/settled debts: only visible in historical months (month <= end month)
   * - Negotiated active/overdue: visible ONLY from startMonthYear to endMonth
   *   (no grace period - debt doesn't appear before first installment month)
   */
  private filterDebtsByMonth(debts: Debt[], monthYear: string): Debt[] {
    return debts.filter((debt) => {
      // Non-negotiated debts: always visible
      if (!debt.isNegotiated) return true;

      // Defaulted debts: always visible
      if (debt.status === 'defaulted') return true;

      // No startMonthYear means legacy data - always visible
      if (!debt.startMonthYear) return true;

      const endMonth = this.calculateEndMonth(
        debt.startMonthYear,
        debt.totalInstallments ?? 1
      );

      // Paid off/settled debts: only historical months
      if (debt.status === 'paid_off' || debt.status === 'settled') {
        return monthYear <= endMonth;
      }

      // Active/overdue debts: visible ONLY from startMonthYear to endMonth
      // No grace period - debt doesn't appear before first installment month
      return debt.startMonthYear <= monthYear && monthYear <= endMonth;
    });
  }

  /**
   * Calculate the end month for a debt based on start month and total installments
   */
  private calculateEndMonth(
    startMonth: string,
    totalInstallments: number
  ): string {
    const parts = startMonth.split('-').map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const endDate = new Date(year, month - 1 + totalInstallments - 1, 1);
    return `${String(endDate.getFullYear())}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
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

  async payInstallment(
    userId: string,
    id: string,
    quantity = 1
  ): Promise<Debt | null> {
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

      const totalInstallments = currentDebt.totalInstallments ?? 0;

      // Calculate new installment number (capped at totalInstallments + 1)
      const newInstallment = Math.min(
        currentDebt.currentInstallment + quantity,
        totalInstallments + 1
      );

      // Check if debt is fully paid
      // If overdue and paying, return to active unless fully paid
      let newStatus: DebtStatus;
      if (newInstallment > totalInstallments) {
        newStatus = 'paid_off';
      } else if (currentDebt.status === 'overdue') {
        newStatus = 'active';
      } else {
        newStatus = currentDebt.status;
      }

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

      // Record the payments in debt_payments for month-aware tracking
      if (updated && currentDebt.installmentAmount) {
        const now = new Date();
        const monthYear = `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Record each payment individually
        for (let i = 0; i < quantity; i++) {
          const installmentNumber = currentDebt.currentInstallment + i;
          if (installmentNumber <= totalInstallments) {
            await db.insert(this.db.schema.debtPayments).values({
              userId,
              debtId: id,
              installmentNumber,
              amount: currentDebt.installmentAmount,
              monthYear,
              paidAt: now,
            });
          }
        }
      }

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
      startMonthYear?: string;
    }
  ): Promise<Debt | null> {
    return this.db.withUserId(userId, async (db) => {
      // Default startMonthYear to current month if not provided
      const now = new Date();
      const startMonthYear =
        data.startMonthYear ??
        `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [updated] = await db
        .update(this.db.schema.debts)
        .set({
          isNegotiated: true,
          totalInstallments: data.totalInstallments,
          installmentAmount: data.installmentAmount.toString(),
          dueDay: data.dueDay,
          startMonthYear,
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

  async getSummary(userId: string, monthYear?: string): Promise<DebtSummary> {
    return this.db.withUserId(userId, async (db) => {
      const debts = await db
        .select()
        .from(this.db.schema.debts)
        .where(eq(this.db.schema.debts.userId, userId));

      let totalAmount = 0;
      let totalPaid = 0;
      let paidFromActiveDebts = 0;
      let negotiatedCount = 0;
      let monthlyInstallmentSum = 0;

      for (const debt of debts) {
        const isActive = debt.status === 'active' || debt.status === 'overdue';

        // Only count active debts in totalAmount
        if (isActive) {
          totalAmount += parseFloat(debt.totalAmount);
        }

        if (debt.isNegotiated && debt.installmentAmount) {
          const paidInstallments = debt.currentInstallment - 1;
          const paidAmount = paidInstallments * parseFloat(debt.installmentAmount);

          // totalPaid = all payments ever made (for "Total Pago" display)
          totalPaid += paidAmount;

          if (isActive) {
            // paidFromActiveDebts = payments from active debts only (for totalRemaining calc)
            paidFromActiveDebts += paidAmount;

            // Check if debt has installment due in the specified month
            const hasInstallmentThisMonth = this.isDebtVisibleInMonth(debt, monthYear);

            if (hasInstallmentThisMonth) {
              negotiatedCount++;
              monthlyInstallmentSum += parseFloat(debt.installmentAmount);
            }
          }
        }
      }

      return {
        totalDebts: debts.length,
        totalAmount,
        totalPaid,
        // totalRemaining = what user currently owes (active debts only)
        totalRemaining: totalAmount - paidFromActiveDebts,
        negotiatedCount,
        monthlyInstallmentSum,
      };
    });
  }

  /**
   * Check if a debt has an installment due in the specified month
   */
  private isDebtVisibleInMonth(
    debt: { startMonthYear: string | null; totalInstallments: number | null; isNegotiated: boolean },
    monthYear?: string
  ): boolean {
    // If no month specified, include all debts
    if (!monthYear) return true;

    // Non-negotiated debts are always visible
    if (!debt.isNegotiated) return true;

    // No startMonthYear means legacy data - always visible
    if (!debt.startMonthYear) return true;

    const endMonth = this.calculateEndMonth(
      debt.startMonthYear,
      debt.totalInstallments ?? 1
    );

    // Debt is visible if monthYear is within [startMonthYear, endMonth]
    return debt.startMonthYear <= monthYear && monthYear <= endMonth;
  }

  async recordPayment(
    userId: string,
    debtId: string,
    data: { installmentNumber: number; amount: number; monthYear: string }
  ): Promise<DebtPayment> {
    return this.db.withUserId(userId, async (db) => {
      const [payment] = await db
        .insert(this.db.schema.debtPayments)
        .values({
          userId,
          debtId,
          installmentNumber: data.installmentNumber,
          amount: data.amount.toString(),
          monthYear: data.monthYear,
        })
        .returning();

      if (!payment) {
        throw new Error('Failed to record debt payment');
      }
      return payment;
    });
  }

  async sumPaymentsByMonthYear(
    userId: string,
    monthYear: string
  ): Promise<number> {
    return this.db.withUserId(userId, async (db) => {
      const [result] = await db
        .select({
          sum: sql<string>`COALESCE(SUM(${this.db.schema.debtPayments.amount}), 0)`,
        })
        .from(this.db.schema.debtPayments)
        .where(
          and(
            eq(this.db.schema.debtPayments.userId, userId),
            eq(this.db.schema.debtPayments.monthYear, monthYear)
          )
        );

      return parseFloat(result?.sum ?? '0');
    });
  }
}
