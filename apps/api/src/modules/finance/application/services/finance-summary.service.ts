// apps/api/src/modules/finance/application/services/finance-summary.service.ts

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../../../logger/logger.service';
import { IncomesService } from './incomes.service';
import { BillsService } from './bills.service';
import { VariableExpensesService } from './variable-expenses.service';
import { DebtsService } from './debts.service';
import { InvestmentsService } from './investments.service';

export interface FinanceSummary {
  monthYear: string;

  // Income
  totalIncomeExpected: number;
  totalIncomeActual: number;

  // Bills (fixed expenses)
  totalBills: number;
  billsCount: {
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    canceled: number;
  };

  // Variable Expenses
  totalExpensesExpected: number;
  totalExpensesActual: number;

  // Budget summary
  totalBudgeted: number; // bills + expenses expected + negotiated debts monthly
  totalSpent: number; // bills paid + expenses actual + debt payments this month
  paidBillsAmount: number; // actual SQL SUM of paid bills
  debtPaymentsThisMonth: number; // actual debt payments for this month

  // Balance
  balance: number; // income actual - total spent

  // Debts
  debts: {
    totalDebts: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    negotiatedCount: number;
    monthlyInstallmentSum: number;
  };

  // Investments
  investments: {
    totalInvestments: number;
    totalCurrentAmount: number;
    totalGoalAmount: number;
    totalMonthlyContribution: number;
    averageProgress: number;
  };
}

export interface MonthlyEvolutionDataPoint {
  monthYear: string;
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface MonthlyEvolutionResult {
  data: MonthlyEvolutionDataPoint[];
  meta: {
    startMonth: string;
    endMonth: string;
    monthsRequested: number;
    monthsReturned: number;
  };
}

@Injectable()
export class FinanceSummaryService {
  constructor(
    private readonly incomesService: IncomesService,
    private readonly billsService: BillsService,
    private readonly variableExpensesService: VariableExpensesService,
    private readonly debtsService: DebtsService,
    private readonly investmentsService: InvestmentsService,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(FinanceSummaryService.name);
  }

  async getSummary(userId: string, monthYear?: string): Promise<FinanceSummary> {
    // Default to current month
    const targetMonth =
      monthYear ?? new Date().toISOString().slice(0, 7); // YYYY-MM

    this.logger.log(`Getting finance summary for user ${userId}, month ${targetMonth}`);

    // Ensure recurring items exist for this month
    await Promise.all([
      this.billsService.ensureRecurringForMonth(userId, targetMonth),
      this.variableExpensesService.ensureRecurringForMonth(userId, targetMonth),
      this.incomesService.ensureRecurringForMonth(userId, targetMonth),
    ]);

    // Fetch all data in parallel
    const [
      incomeExpected,
      incomeActual,
      totalBills,
      billStatusCounts,
      paidBillsAmount,
      expensesExpected,
      expensesActual,
      debtsSummary,
      debtPaymentsThisMonth,
      investmentsSummary,
    ] = await Promise.all([
      this.incomesService.sumByMonthYear(userId, targetMonth, 'expectedAmount'),
      this.incomesService.sumByMonthYear(userId, targetMonth, 'actualAmount'),
      this.billsService.sumByMonthYear(userId, targetMonth),
      this.billsService.countByStatus(userId, targetMonth),
      this.billsService.sumByMonthYearAndStatus(userId, targetMonth, 'paid'),
      this.variableExpensesService.sumByMonthYear(userId, targetMonth, 'expectedAmount'),
      this.variableExpensesService.sumByMonthYear(userId, targetMonth, 'actualAmount'),
      this.debtsService.getSummary(userId, targetMonth),
      this.debtsService.sumPaymentsByMonthYear(userId, targetMonth),
      this.investmentsService.getSummary(userId),
    ]);

    // Calculate totals with safe defaults
    const pending = billStatusCounts.pending ?? 0;
    const paid = billStatusCounts.paid ?? 0;
    const overdue = billStatusCounts.overdue ?? 0;
    const canceled = billStatusCounts.canceled ?? 0;
    const totalBillsCount = pending + paid + overdue + canceled;

    // Total budgeted = bills + variable expenses expected + monthly debt installments
    const totalBudgeted =
      totalBills + expensesExpected + debtsSummary.monthlyInstallmentSum;

    // Total spent = paid bills + variable expenses actual + debt payments this month
    const totalSpent = paidBillsAmount + expensesActual + debtPaymentsThisMonth;

    // Balance = income actual - total spent
    const balance = incomeActual - totalSpent;

    const summary: FinanceSummary = {
      monthYear: targetMonth,

      // Income
      totalIncomeExpected: incomeExpected,
      totalIncomeActual: incomeActual,

      // Bills
      totalBills,
      billsCount: {
        total: totalBillsCount,
        pending,
        paid,
        overdue,
        canceled,
      },

      // Variable Expenses
      totalExpensesExpected: expensesExpected,
      totalExpensesActual: expensesActual,

      // Budget summary
      totalBudgeted,
      totalSpent,
      paidBillsAmount,
      debtPaymentsThisMonth,

      // Balance
      balance,

      // Debts
      debts: debtsSummary,

      // Investments
      investments: investmentsSummary,
    };

    this.logger.log(`Finance summary calculated for ${targetMonth}`);
    return summary;
  }

  /**
   * Get monthly evolution history for the last N months
   *
   * @param userId - User ID
   * @param endMonth - End month in YYYY-MM format (defaults to current month)
   * @param monthsCount - Number of months to fetch (1-12, defaults to 6)
   * @returns Monthly evolution data with income, expenses, and balance for each month
   */
  async getHistoricalSummary(
    userId: string,
    endMonth?: string,
    monthsCount = 6
  ): Promise<MonthlyEvolutionResult> {
    const end = endMonth ?? new Date().toISOString().slice(0, 7);
    const months = this.generateMonthRange(end, monthsCount);

    const startMonth = months[0] ?? end;
    const endMonthResult = months[months.length - 1] ?? end;

    this.logger.log(
      `Getting historical summary for user ${userId}, months ${startMonth} to ${endMonthResult}`
    );

    // Fetch summaries in parallel for all months
    const summaries = await Promise.all(
      months.map((month) => this.getSummary(userId, month))
    );

    // Transform to evolution format
    const data: MonthlyEvolutionDataPoint[] = [];
    for (let i = 0; i < summaries.length; i++) {
      const summary = summaries[i];
      const monthYear = months[i];
      if (summary && monthYear) {
        data.push({
          monthYear,
          monthLabel: this.formatMonthLabel(monthYear),
          income: summary.totalIncomeActual,
          expenses: summary.totalSpent,
          balance: summary.balance,
        });
      }
    }

    return {
      data,
      meta: {
        startMonth,
        endMonth: endMonthResult,
        monthsRequested: monthsCount,
        monthsReturned: data.length,
      },
    };
  }

  /**
   * Generate array of month strings from end month going back N months
   * @returns Array in chronological order (oldest first)
   */
  private generateMonthRange(endMonth: string, count: number): string[] {
    const parts = endMonth.split('-');
    const yearStr = parts[0] ?? '2024';
    const monthStr = parts[1] ?? '01';
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const months: string[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(year, month - 1 - i, 1);
      const fullYear = date.getFullYear();
      const monthNum = date.getMonth() + 1;
      months.push(`${String(fullYear)}-${String(monthNum).padStart(2, '0')}`);
    }
    return months;
  }

  /**
   * Format month year to short Portuguese label (e.g., "Jan", "Fev")
   */
  private formatMonthLabel(monthYear: string): string {
    const labels = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const parts = monthYear.split('-');
    const monthStr = parts[1] ?? '01';
    const monthIndex = parseInt(monthStr, 10) - 1;
    return labels[monthIndex] ?? 'Jan';
  }
}
