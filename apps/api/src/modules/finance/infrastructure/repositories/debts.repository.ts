// apps/api/src/modules/finance/infrastructure/repositories/debts.repository.ts

import { Injectable } from '@nestjs/common';
import { eq, and, count, sql } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { Debt, NewDebt, DebtStatus } from '@life-assistant/database';
import type {
  DebtsRepositoryPort,
  DebtSearchParams,
  DebtSummary,
  DebtPaymentWithEarly,
  UpcomingInstallment,
  UpcomingInstallmentStatus,
  TodayContext,
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

  /**
   * Calculate which month an installment belongs to based on startMonthYear and installmentNumber
   * Example: startMonthYear='2026-02', installmentNumber=3 → '2026-04' (April)
   */
  private calculateInstallmentMonth(
    startMonthYear: string,
    installmentNumber: number
  ): string {
    const parts = startMonthYear.split('-').map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    // installmentNumber is 1-based, so installment 1 = startMonth, installment 2 = startMonth + 1, etc.
    const targetDate = new Date(year, month - 1 + (installmentNumber - 1), 1);
    return `${String(targetDate.getFullYear())}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
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
      if (updated && currentDebt.installmentAmount && currentDebt.startMonthYear) {
        const now = new Date();

        // Record each payment individually
        for (let i = 0; i < quantity; i++) {
          const installmentNumber = currentDebt.currentInstallment + i;
          if (installmentNumber <= totalInstallments) {
            // Calculate the month this installment belongs to (not when it was paid)
            const belongsToMonthYear = this.calculateInstallmentMonth(
              currentDebt.startMonthYear,
              installmentNumber
            );

            await db.insert(this.db.schema.debtPayments).values({
              userId,
              debtId: id,
              installmentNumber,
              amount: currentDebt.installmentAmount,
              monthYear: belongsToMonthYear, // Month the installment belongs to
              paidAt: now, // When it was actually paid
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

  async getPaymentHistory(
    userId: string,
    debtId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<DebtPaymentWithEarly[]> {
    return this.db.withUserId(userId, async (db) => {
      const payments = await db
        .select()
        .from(this.db.schema.debtPayments)
        .where(
          and(
            eq(this.db.schema.debtPayments.userId, userId),
            eq(this.db.schema.debtPayments.debtId, debtId)
          )
        )
        .orderBy(this.db.schema.debtPayments.installmentNumber)
        .limit(params?.limit ?? 100)
        .offset(params?.offset ?? 0);

      // Calculate paidEarly for each payment
      // A payment is "early" if paidAt month < monthYear (the installment's scheduled month)
      return payments.map((payment) => {
        const paidAtMonth = `${String(payment.paidAt.getFullYear())}-${String(payment.paidAt.getMonth() + 1).padStart(2, '0')}`;
        const paidEarly = paidAtMonth < payment.monthYear;

        return {
          ...payment,
          paidEarly,
        };
      });
    });
  }

  async getUpcomingInstallments(
    userId: string,
    monthYear: string,
    today: TodayContext
  ): Promise<UpcomingInstallment[]> {
    return this.db.withUserId(userId, async (db) => {
      // Get all active/overdue negotiated debts that have installments in this month
      const debts = await db
        .select()
        .from(this.db.schema.debts)
        .where(
          and(
            eq(this.db.schema.debts.userId, userId),
            eq(this.db.schema.debts.isNegotiated, true)
          )
        );

      // Filter to debts that have an installment in this month
      const debtsWithInstallmentsThisMonth = debts.filter((debt) => {
        if (!debt.startMonthYear || !debt.totalInstallments) return false;

        // Check if this month falls within the debt's installment range
        const endMonth = this.calculateEndMonth(
          debt.startMonthYear,
          debt.totalInstallments
        );

        return debt.startMonthYear <= monthYear && monthYear <= endMonth;
      });

      // Get all payments for the target month to check what's already paid
      const payments = await db
        .select()
        .from(this.db.schema.debtPayments)
        .where(
          and(
            eq(this.db.schema.debtPayments.userId, userId),
            eq(this.db.schema.debtPayments.monthYear, monthYear)
          )
        );

      // Create a map of debtId -> payment for quick lookup
      const paymentsByDebtId = new Map<string, typeof payments[0]>();
      for (const payment of payments) {
        paymentsByDebtId.set(payment.debtId, payment);
      }

      // Use timezone-aware "today" context from service for overdue checking
      // This ensures correct overdue detection regardless of server timezone
      const { month: currentMonth, day: currentDay } = today;

      // Build the installments array
      const installments: UpcomingInstallment[] = [];

      for (const debt of debtsWithInstallmentsThisMonth) {
        if (!debt.startMonthYear || !debt.totalInstallments || !debt.installmentAmount) {
          continue;
        }

        // Calculate which installment number this month corresponds to
        const installmentNumber = this.calculateInstallmentNumberForMonth(
          debt.startMonthYear,
          monthYear
        );

        // Skip if installment number is out of range
        if (installmentNumber < 1 || installmentNumber > debt.totalInstallments) {
          continue;
        }

        const payment = paymentsByDebtId.get(debt.id);
        let status: UpcomingInstallmentStatus;
        let paidAt: Date | null = null;
        let paidInMonth: string | null = null;

        if (payment) {
          // This installment was paid
          paidAt = payment.paidAt;
          paidInMonth = `${String(paidAt.getFullYear())}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`;

          if (paidInMonth < monthYear) {
            status = 'paid_early';
          } else {
            status = 'paid';
          }
        } else {
          // Not paid yet - check if overdue
          const isOverdue =
            monthYear < currentMonth ||
            (monthYear === currentMonth && debt.dueDay !== null && currentDay > debt.dueDay);

          status = isOverdue ? 'overdue' : 'pending';
        }

        installments.push({
          debtId: debt.id,
          debtName: debt.name,
          creditor: debt.creditor,
          installmentNumber,
          totalInstallments: debt.totalInstallments,
          amount: parseFloat(debt.installmentAmount),
          dueDay: debt.dueDay ?? 1,
          belongsToMonthYear: monthYear,
          status,
          paidAt,
          paidInMonth,
        });
      }

      // Sort by due day
      installments.sort((a, b) => a.dueDay - b.dueDay);

      return installments;
    });
  }

  /**
   * Calculate which installment number corresponds to a given month
   * Example: startMonthYear='2026-02', targetMonth='2026-04' → installment 3
   */
  private calculateInstallmentNumberForMonth(
    startMonthYear: string,
    targetMonth: string
  ): number {
    const startParts = startMonthYear.split('-').map(Number);
    const targetParts = targetMonth.split('-').map(Number);

    const startYear = startParts[0] ?? 2026;
    const startMonth = startParts[1] ?? 1;
    const targetYear = targetParts[0] ?? 2026;
    const targetMonthNum = targetParts[1] ?? 1;

    const monthsDiff =
      (targetYear - startYear) * 12 + (targetMonthNum - startMonth);

    // Installment number is 1-based
    return monthsDiff + 1;
  }
}
