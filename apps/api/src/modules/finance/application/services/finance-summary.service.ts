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
  totalSpent: number; // bills paid + expenses actual

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
      this.debtsService.getSummary(userId),
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
}
