// apps/api/src/modules/finance/application/services/finance-tool-executor.service.ts

import { Injectable, Logger } from '@nestjs/common';
import type { ToolCall } from '@life-assistant/ai';
import {
  type ToolExecutor,
  type ToolExecutionResult,
  type ToolExecutionContext,
  createSuccessResult,
  createErrorResult,
} from '@life-assistant/ai';
import {
  getFinanceSummaryParamsSchema,
  getPendingBillsParamsSchema,
  getBillsParamsSchema,
  getExpensesParamsSchema,
  getIncomesParamsSchema,
  getInvestmentsParamsSchema,
  markBillPaidParamsSchema,
  createExpenseParamsSchema,
  getDebtProgressParamsSchema,
  getDebtPaymentHistoryParamsSchema,
  getUpcomingInstallmentsParamsSchema,
} from '@life-assistant/ai';
import {
  getCurrentMonthInTimezone,
  getTodayInTimezone,
  getDaysUntilDueDay,
} from '@life-assistant/shared';
import { FinanceSummaryService } from './finance-summary.service';
import { BillsService } from './bills.service';
import { VariableExpensesService } from './variable-expenses.service';
import { DebtsService } from './debts.service';
import { IncomesService } from './incomes.service';
import { InvestmentsService } from './investments.service';
import { SettingsService } from '../../../settings/application/services/settings.service';

/**
 * Finance Tool Executor - Executes finance-related tools for AI chat
 *
 * @see docs/specs/ai.md §6.2 for tool definitions
 * @see docs/milestones/phase-2-tracker.md M2.2 for implementation
 */
@Injectable()
export class FinanceToolExecutorService implements ToolExecutor {
  private readonly logger = new Logger(FinanceToolExecutorService.name);

  constructor(
    private readonly financeSummaryService: FinanceSummaryService,
    private readonly billsService: BillsService,
    private readonly variableExpensesService: VariableExpensesService,
    private readonly debtsService: DebtsService,
    private readonly incomesService: IncomesService,
    private readonly investmentsService: InvestmentsService,
    private readonly settingsService: SettingsService
  ) {}

  /**
   * Get user's timezone from settings, defaulting to America/Sao_Paulo
   */
  private async getUserTimezone(userId: string): Promise<string> {
    try {
      const settings = await this.settingsService.getUserSettings(userId);
      return settings.timezone;
    } catch {
      return 'America/Sao_Paulo';
    }
  }

  /**
   * Execute a tool call
   */
  async execute(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const { userId } = context;

    this.logger.log(`Executing tool ${toolCall.name} for user ${userId}`);

    try {
      switch (toolCall.name) {
        case 'get_finance_summary':
          return await this.executeGetFinanceSummary(toolCall, userId);

        case 'get_pending_bills':
          return await this.executeGetPendingBills(toolCall, userId);

        case 'mark_bill_paid':
          return await this.executeMarkBillPaid(toolCall, userId);

        case 'create_expense':
          return await this.executeCreateExpense(toolCall, userId);

        case 'get_bills':
          return await this.executeGetBills(toolCall, userId);

        case 'get_expenses':
          return await this.executeGetExpenses(toolCall, userId);

        case 'get_incomes':
          return await this.executeGetIncomes(toolCall, userId);

        case 'get_investments':
          return await this.executeGetInvestments(toolCall, userId);

        case 'get_debt_progress':
          return await this.executeGetDebtProgress(toolCall, userId);

        case 'get_debt_payment_history':
          return await this.executeGetDebtPaymentHistory(toolCall, userId);

        case 'get_upcoming_installments':
          return await this.executeGetUpcomingInstallments(toolCall, userId);

        default:
          return createErrorResult(
            toolCall,
            new Error(`Unknown finance tool: ${toolCall.name}`)
          );
      }
    } catch (error) {
      this.logger.error(
        `Tool execution error: ${error instanceof Error ? error.message : String(error)}`
      );
      return createErrorResult(toolCall, error);
    }
  }

  /**
   * Execute get_finance_summary tool
   */
  private async executeGetFinanceSummary(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getFinanceSummaryParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { period } = parseResult.data;

    this.logger.debug(`get_finance_summary params: period=${period}`);

    // Get user timezone for accurate date calculations
    const timezone = await this.getUserTimezone(userId);

    // Map period to monthYear using timezone-aware calculation
    let monthYear: string | undefined;
    const currentMonth = getCurrentMonthInTimezone(timezone);
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    switch (period) {
      case 'current_month':
        monthYear = currentMonth;
        break;
      case 'last_month': {
        const lastMonth = new Date(year, month - 2, 1); // month-2 because Date uses 0-indexed months
        monthYear = `${String(lastMonth.getFullYear())}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        break;
      }
      case 'year':
        // For year, we don't pass monthYear (service will aggregate)
        monthYear = undefined;
        break;
    }

    const summary = await this.financeSummaryService.getSummary(userId, monthYear);

    this.logger.log(`get_finance_summary returned for ${summary.monthYear}`);

    // Format for AI - match ai.md §6.2 expected response
    return createSuccessResult(toolCall, {
      kpis: {
        income: summary.totalIncomeActual,
        budgeted: summary.totalBudgeted,
        spent: summary.totalSpent,
        balance: summary.balance,
        invested: summary.investments.totalCurrentAmount,
      },
      breakdown: {
        bills: {
          total: summary.totalBills,
          paidAmount: summary.paidBillsAmount,
          pendingAmount: summary.totalBills - summary.paidBillsAmount,
        },
        expenses: {
          expected: summary.totalExpensesExpected,
          actual: summary.totalExpensesActual,
        },
        debts: {
          paymentsThisMonth: summary.debtPaymentsThisMonth,
        },
      },
      income: {
        expected: summary.totalIncomeExpected,
        actual: summary.totalIncomeActual,
      },
      debts: {
        totalDebts: summary.debts.totalDebts,
        totalAmount: summary.debts.totalAmount,
        monthlyInstallment: summary.debts.monthlyInstallmentSum,
        totalPaid: summary.debts.totalPaid,
        totalRemaining: summary.debts.totalRemaining,
        negotiatedCount: summary.debts.negotiatedCount,
        pendingNegotiationCount: summary.debts.totalDebts - summary.debts.negotiatedCount,
      },
      billsCount: summary.billsCount,
      investments: {
        count: summary.investments.totalInvestments,
        totalCurrent: summary.investments.totalCurrentAmount,
        totalGoal: summary.investments.totalGoalAmount,
        monthlyContribution: summary.investments.totalMonthlyContribution,
        averageProgress: summary.investments.averageProgress,
      },
      monthYear: summary.monthYear,
    });
  }

  /**
   * Execute get_pending_bills tool
   */
  private async executeGetPendingBills(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getPendingBillsParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { month, year } = parseResult.data;

    // Get user timezone for accurate date calculations
    const timezone = await this.getUserTimezone(userId);
    const currentMonth = getCurrentMonthInTimezone(timezone);
    const [currentYearStr, currentMonthStr] = currentMonth.split('-');

    // Default to current month/year in user's timezone
    const targetMonth = month ?? Number(currentMonthStr);
    const targetYear = year ?? Number(currentYearStr);
    const monthYear = `${String(targetYear)}-${String(targetMonth).padStart(2, '0')}`;

    this.logger.debug(`get_pending_bills params: monthYear=${monthYear}`);

    // Get all bills with pending/overdue status
    const { bills } = await this.billsService.findAll(userId, {
      monthYear,
      status: 'pending', // Will also include overdue via date logic
    });

    // Calculate due status for each bill using timezone-aware calculation
    const formattedBills = bills.map((bill) => {
      const daysUntilDue = getDaysUntilDueDay(bill.dueDay, timezone);
      const status = daysUntilDue < 0 ? 'overdue' : 'pending';

      return {
        id: bill.id,
        name: bill.name,
        category: bill.category,
        amount: parseFloat(bill.amount),
        dueDay: bill.dueDay,
        status,
        daysUntilDue,
      };
    });

    // Calculate summary
    const pendingBills = formattedBills.filter((b) => b.status === 'pending');
    const overdueBills = formattedBills.filter((b) => b.status === 'overdue');

    const summary = {
      totalPending: pendingBills.reduce((sum, b) => sum + b.amount, 0),
      totalOverdue: overdueBills.reduce((sum, b) => sum + b.amount, 0),
      countPending: pendingBills.length,
      countOverdue: overdueBills.length,
    };

    this.logger.log(
      `get_pending_bills returned ${String(formattedBills.length)} bills for ${monthYear}`
    );

    return createSuccessResult(toolCall, {
      bills: formattedBills,
      summary,
      monthYear,
    });
  }

  /**
   * Execute mark_bill_paid tool
   *
   * Note: This tool has requiresConfirmation: true
   */
  private async executeMarkBillPaid(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = markBillPaidParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { billId } = parseResult.data;

    this.logger.debug(`mark_bill_paid params: billId=${billId}`);

    // Get bill info before marking as paid
    const bill = await this.billsService.findById(userId, billId);

    // Mark as paid
    const updatedBill = await this.billsService.markAsPaid(userId, billId);

    this.logger.log(`mark_bill_paid: bill ${billId} marked as paid`);

    return createSuccessResult(toolCall, {
      success: true,
      bill: {
        id: updatedBill.id,
        name: updatedBill.name,
        amount: parseFloat(updatedBill.amount),
      },
      paidAt: new Date().toISOString(),
      message: `Conta "${bill.name}" marcada como paga (R$ ${parseFloat(bill.amount).toFixed(2)})`,
    });
  }

  /**
   * Execute create_expense tool
   *
   * Note: This tool has requiresConfirmation: true
   */
  private async executeCreateExpense(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = createExpenseParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { name, category, budgetedAmount, actualAmount, isRecurring } =
      parseResult.data;

    this.logger.debug(
      `create_expense params: name=${name}, category=${category}, actualAmount=${String(actualAmount)}`
    );

    // Map Portuguese categories (from LLM tool) to English (database schema)
    const categoryMapping: Record<string, string> = {
      alimentacao: 'food',
      transporte: 'transport',
      lazer: 'entertainment',
      saude: 'health',
      educacao: 'education',
      vestuario: 'shopping',
      outros: 'other',
    };
    const dbCategory = categoryMapping[category] ?? 'other';

    // Get user timezone for accurate month calculation
    const timezone = await this.getUserTimezone(userId);
    const currentMonth = getCurrentMonthInTimezone(timezone);

    // Create the expense
    const expense = await this.variableExpensesService.create(userId, {
      name,
      category: dbCategory as 'food' | 'transport' | 'housing' | 'health' | 'education' | 'entertainment' | 'shopping' | 'bills' | 'subscriptions' | 'travel' | 'gifts' | 'investments' | 'other',
      expectedAmount: String(budgetedAmount ?? actualAmount ?? 0),
      actualAmount: String(actualAmount ?? 0),
      isRecurring,
      monthYear: currentMonth,
    });

    this.logger.log(`create_expense: expense ${expense.id} created`);

    // Category labels for Portuguese response
    const categoryLabels: Record<string, string> = {
      alimentacao: 'Alimentacao',
      transporte: 'Transporte',
      lazer: 'Lazer',
      saude: 'Saude',
      educacao: 'Educacao',
      vestuario: 'Vestuario',
      outros: 'Outros',
    };

    return createSuccessResult(toolCall, {
      success: true,
      expense: {
        id: expense.id,
        name: expense.name,
        category: expense.category,
        actualAmount: actualAmount ?? budgetedAmount ?? 0,
      },
      message: `Despesa "${name}" (${categoryLabels[category] ?? category}) registrada: R$ ${(actualAmount ?? budgetedAmount ?? 0).toFixed(2)}`,
    });
  }

  /**
   * Execute get_debt_progress tool
   * Now includes projection data for estimating payoff dates
   */
  private async executeGetDebtProgress(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getDebtProgressParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { debtId, monthYear } = parseResult.data;

    this.logger.debug(
      `get_debt_progress params: debtId=${debtId ?? 'all'}, monthYear=${monthYear ?? 'none'}`
    );

    // Get user timezone for accurate date calculations
    const timezone = await this.getUserTimezone(userId);

    if (debtId) {
      // Get specific debt
      const debt = await this.debtsService.findById(userId, debtId);
      const formattedDebt = this.formatDebtForResponse(debt, monthYear, timezone);

      // Add projection for the specific debt
      const projection = await this.debtsService.calculateProjection(userId, debtId);
      formattedDebt.projection = {
        estimatedPayoffMonthYear: projection.estimatedPayoffMonthYear,
        remainingMonths: projection.remainingMonths,
        avgPaymentsPerMonth: projection.paymentVelocity.avgPaymentsPerMonth,
        isRegularPayment: projection.paymentVelocity.isRegular,
        message: projection.message,
      };

      return createSuccessResult(toolCall, {
        debts: [formattedDebt],
        summary: {
          totalDebts: 1,
          totalPaid: formattedDebt.totalPaid as number,
          totalRemaining: formattedDebt.totalRemaining as number,
          averageProgress: formattedDebt.percentComplete as number,
          overdueCount: formattedDebt.status === 'overdue' ? 1 : 0,
        },
      });
    }

    // Get all debts (filtered by monthYear if provided)
    const { debts } = await this.debtsService.findAll(userId, { monthYear });

    // Format debts and add projections (only for negotiated debts)
    const formattedDebts = await Promise.all(
      debts.map(async (debt) => {
        const formatted = this.formatDebtForResponse(debt, monthYear, timezone);

        // Only calculate projection for negotiated debts with installments
        if (debt.isNegotiated && debt.totalInstallments && debt.status !== 'paid_off') {
          try {
            const projection = await this.debtsService.calculateProjection(userId, debt.id);
            formatted.projection = {
              estimatedPayoffMonthYear: projection.estimatedPayoffMonthYear,
              remainingMonths: projection.remainingMonths,
              avgPaymentsPerMonth: projection.paymentVelocity.avgPaymentsPerMonth,
              isRegularPayment: projection.paymentVelocity.isRegular,
              message: projection.message,
            };
          } catch (error) {
            this.logger.warn(
              `Failed to calculate projection for debt ${debt.id}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        return formatted;
      })
    );

    // Calculate summary
    const totalPaid = formattedDebts.reduce(
      (sum, d) => sum + (d.totalPaid as number),
      0
    );
    const totalRemaining = formattedDebts.reduce(
      (sum, d) => sum + (d.totalRemaining as number),
      0
    );
    const averageProgress =
      formattedDebts.length > 0
        ? Math.round(
            formattedDebts.reduce(
              (sum, d) => sum + (d.percentComplete as number),
              0
            ) / formattedDebts.length
          )
        : 0;
    const overdueCount = formattedDebts.filter((d) => d.status === 'overdue')
      .length;

    this.logger.log(
      `get_debt_progress returned ${String(formattedDebts.length)} debts${monthYear ? ` for ${monthYear}` : ''}`
    );

    return createSuccessResult(toolCall, {
      debts: formattedDebts,
      summary: {
        totalDebts: formattedDebts.length,
        totalPaid,
        totalRemaining,
        averageProgress,
        overdueCount,
      },
    });
  }

  /**
   * Execute get_debt_payment_history tool
   */
  private async executeGetDebtPaymentHistory(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getDebtPaymentHistoryParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { debtId, limit } = parseResult.data;

    this.logger.debug(
      `get_debt_payment_history params: debtId=${debtId}, limit=${String(limit ?? 50)}`
    );

    const result = await this.debtsService.getPaymentHistory(userId, debtId, {
      limit: limit ?? 50,
    });

    // Format payments for AI response
    const formattedPayments = result.payments.map((payment) => ({
      installmentNumber: payment.installmentNumber,
      amount: parseFloat(payment.amount),
      belongsToMonthYear: payment.monthYear,
      paidAt: payment.paidAt.toISOString(),
      paidEarly: payment.paidEarly,
    }));

    this.logger.log(
      `get_debt_payment_history returned ${String(result.payments.length)} payments for debt ${debtId}`
    );

    return createSuccessResult(toolCall, {
      payments: formattedPayments,
      summary: result.summary,
      debt: result.debt,
    });
  }

  /**
   * Execute get_upcoming_installments tool
   */
  private async executeGetUpcomingInstallments(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getUpcomingInstallmentsParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { monthYear } = parseResult.data;

    this.logger.debug(
      `get_upcoming_installments params: monthYear=${monthYear ?? 'current'}`
    );

    const result = await this.debtsService.getUpcomingInstallments(userId, monthYear);

    // Format installments for AI response
    const formattedInstallments = result.installments.map((inst) => ({
      debtId: inst.debtId,
      debtName: inst.debtName,
      creditor: inst.creditor,
      installmentNumber: inst.installmentNumber,
      totalInstallments: inst.totalInstallments,
      amount: inst.amount,
      dueDay: inst.dueDay,
      belongsToMonthYear: inst.belongsToMonthYear,
      status: inst.status,
      paidAt: inst.paidAt?.toISOString() ?? null,
      paidInMonth: inst.paidInMonth,
    }));

    // Get user timezone for accurate month calculation
    const timezone = await this.getUserTimezone(userId);
    const targetMonth = monthYear ?? getCurrentMonthInTimezone(timezone);

    this.logger.log(
      `get_upcoming_installments returned ${String(result.installments.length)} installments for ${targetMonth}`
    );

    return createSuccessResult(toolCall, {
      installments: formattedInstallments,
      summary: result.summary,
      monthYear: targetMonth,
    });
  }

  /**
   * Format a debt for API response
   */
  private formatDebtForResponse(
    debt: {
      id: string;
      name: string;
      creditor: string | null;
      totalAmount: string;
      installmentAmount: string | null;
      totalInstallments: number | null;
      currentInstallment: number;
      dueDay: number | null;
      startMonthYear: string | null;
      isNegotiated: boolean;
      status: string;
      createdAt: Date;
    },
    _monthYear?: string,
    timezone = 'America/Sao_Paulo'
  ): Record<string, unknown> {
    const totalAmount = parseFloat(debt.totalAmount);
    const installmentAmount = debt.installmentAmount
      ? parseFloat(debt.installmentAmount)
      : 0;
    const paidInstallments = debt.currentInstallment - 1;
    const totalInstallments = debt.totalInstallments ?? 0;
    const remainingInstallments = totalInstallments - paidInstallments;
    const totalPaid = installmentAmount * paidInstallments;
    const totalRemaining = totalAmount - totalPaid;
    const percentComplete =
      totalInstallments > 0
        ? Math.round((paidInstallments / totalInstallments) * 100)
        : 0;

    const result: Record<string, unknown> = {
      id: debt.id,
      name: debt.name,
      totalAmount,
      installmentAmount,
      totalInstallments,
      paidInstallments,
      remainingInstallments,
      totalPaid,
      totalRemaining,
      percentComplete,
      isNegotiated: debt.isNegotiated,
      status: debt.status,
    };

    if (debt.creditor) {
      result.creditor = debt.creditor;
    }
    if (debt.dueDay) {
      result.nextDueDate = this.getNextDueDate(debt.dueDay, timezone);
    }
    if (debt.startMonthYear) {
      result.startMonthYear = debt.startMonthYear;
    }

    return result;
  }

  /**
   * Execute get_bills tool
   */
  private async executeGetBills(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getBillsParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { month, year, status } = parseResult.data;

    // Get user timezone for accurate date calculations
    const timezone = await this.getUserTimezone(userId);
    const currentMonth = getCurrentMonthInTimezone(timezone);
    const [currentYearStr, currentMonthStr] = currentMonth.split('-');

    // Default to current month/year in user's timezone
    const targetMonth = month ?? Number(currentMonthStr);
    const targetYear = year ?? Number(currentYearStr);
    const monthYear = `${String(targetYear)}-${String(targetMonth).padStart(2, '0')}`;

    this.logger.debug(`get_bills params: monthYear=${monthYear}, status=${status}`);

    // Ensure recurring bills exist for this month
    await this.billsService.ensureRecurringForMonth(userId, monthYear);

    // Get all bills (status='all' means no filter)
    const findParams: { monthYear: string; status?: string } = { monthYear };
    if (status !== 'all') {
      findParams.status = status;
    }

    const { bills } = await this.billsService.findAll(userId, findParams);

    // Calculate due status for each bill using timezone-aware calculation
    const formattedBills = bills.map((bill) => {
      const daysUntilDue = getDaysUntilDueDay(bill.dueDay, timezone);

      return {
        id: bill.id,
        name: bill.name,
        category: bill.category,
        amount: parseFloat(bill.amount),
        dueDay: bill.dueDay,
        status: bill.status,
        paidAt: bill.paidAt ? bill.paidAt.toISOString() : null,
        isRecurring: bill.isRecurring,
        monthYear: bill.monthYear,
        currency: bill.currency,
        daysUntilDue,
      };
    });

    // Calculate summary
    const paidBills = formattedBills.filter((b) => b.status === 'paid');
    const pendingBills = formattedBills.filter((b) => b.status === 'pending');
    const overdueBills = formattedBills.filter((b) => b.status === 'overdue');

    const summary = {
      totalAmount: formattedBills.reduce((sum, b) => sum + b.amount, 0),
      paidAmount: paidBills.reduce((sum, b) => sum + b.amount, 0),
      pendingAmount: pendingBills.reduce((sum, b) => sum + b.amount, 0),
      overdueAmount: overdueBills.reduce((sum, b) => sum + b.amount, 0),
      count: formattedBills.length,
      paidCount: paidBills.length,
      pendingCount: pendingBills.length,
      overdueCount: overdueBills.length,
    };

    this.logger.log(
      `get_bills returned ${String(formattedBills.length)} bills for ${monthYear}`
    );

    return createSuccessResult(toolCall, {
      bills: formattedBills,
      summary,
      monthYear,
    });
  }

  /**
   * Execute get_expenses tool
   */
  private async executeGetExpenses(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getExpensesParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { month, year } = parseResult.data;

    // Get user timezone for accurate date calculations
    const timezone = await this.getUserTimezone(userId);
    const currentMonth = getCurrentMonthInTimezone(timezone);
    const [currentYearStr, currentMonthStr] = currentMonth.split('-');

    // Default to current month/year in user's timezone
    const targetMonth = month ?? Number(currentMonthStr);
    const targetYear = year ?? Number(currentYearStr);
    const monthYear = `${String(targetYear)}-${String(targetMonth).padStart(2, '0')}`;

    this.logger.debug(`get_expenses params: monthYear=${monthYear}`);

    // Ensure recurring expenses exist for this month
    await this.variableExpensesService.ensureRecurringForMonth(userId, monthYear);

    const { expenses } = await this.variableExpensesService.findAll(userId, { monthYear });

    const formattedExpenses = expenses.map((expense) => {
      const expectedAmount = parseFloat(expense.expectedAmount);
      const actualAmount = parseFloat(expense.actualAmount);
      const variance = actualAmount - expectedAmount;
      const percentUsed = expectedAmount > 0 ? Math.round((actualAmount / expectedAmount) * 100) : 0;

      return {
        id: expense.id,
        name: expense.name,
        category: expense.category,
        expectedAmount,
        actualAmount,
        isRecurring: expense.isRecurring,
        monthYear: expense.monthYear,
        currency: expense.currency,
        variance,
        percentUsed,
      };
    });

    // Calculate summary
    const totalExpected = formattedExpenses.reduce((sum, e) => sum + e.expectedAmount, 0);
    const totalActual = formattedExpenses.reduce((sum, e) => sum + e.actualAmount, 0);
    const recurringCount = formattedExpenses.filter((e) => e.isRecurring).length;
    const oneTimeCount = formattedExpenses.filter((e) => !e.isRecurring).length;
    const overBudgetCount = formattedExpenses.filter((e) => e.variance > 0).length;

    const summary = {
      totalExpected,
      totalActual,
      variance: totalActual - totalExpected,
      recurringCount,
      oneTimeCount,
      overBudgetCount,
    };

    this.logger.log(
      `get_expenses returned ${String(formattedExpenses.length)} expenses for ${monthYear}`
    );

    return createSuccessResult(toolCall, {
      expenses: formattedExpenses,
      summary,
      monthYear,
    });
  }

  /**
   * Execute get_incomes tool
   */
  private async executeGetIncomes(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getIncomesParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    const { month, year } = parseResult.data;

    // Get user timezone for accurate date calculations
    const timezone = await this.getUserTimezone(userId);
    const currentMonth = getCurrentMonthInTimezone(timezone);
    const [currentYearStr, currentMonthStr] = currentMonth.split('-');

    // Default to current month/year in user's timezone
    const targetMonth = month ?? Number(currentMonthStr);
    const targetYear = year ?? Number(currentYearStr);
    const monthYear = `${String(targetYear)}-${String(targetMonth).padStart(2, '0')}`;

    this.logger.debug(`get_incomes params: monthYear=${monthYear}`);

    // Ensure recurring incomes exist for this month
    await this.incomesService.ensureRecurringForMonth(userId, monthYear);

    const { incomes } = await this.incomesService.findAll(userId, { monthYear });

    const formattedIncomes = incomes.map((income) => {
      const expectedAmount = parseFloat(income.expectedAmount);
      const actualAmount = income.actualAmount ? parseFloat(income.actualAmount) : null;
      const variance = actualAmount !== null ? actualAmount - expectedAmount : null;

      return {
        id: income.id,
        name: income.name,
        type: income.type,
        frequency: income.frequency,
        expectedAmount,
        actualAmount,
        isRecurring: income.isRecurring,
        monthYear: income.monthYear,
        currency: income.currency,
        variance,
      };
    });

    // Calculate summary
    const totalExpected = formattedIncomes.reduce((sum, i) => sum + i.expectedAmount, 0);
    const totalActual = formattedIncomes.reduce((sum, i) => sum + (i.actualAmount ?? 0), 0);
    const receivedCount = formattedIncomes.filter((i) => i.actualAmount !== null).length;
    const pendingCount = formattedIncomes.filter((i) => i.actualAmount === null).length;

    const summary = {
      totalExpected,
      totalActual,
      variance: totalActual - totalExpected,
      count: formattedIncomes.length,
      receivedCount,
      pendingCount,
    };

    this.logger.log(
      `get_incomes returned ${String(formattedIncomes.length)} incomes for ${monthYear}`
    );

    return createSuccessResult(toolCall, {
      incomes: formattedIncomes,
      summary,
      monthYear,
    });
  }

  /**
   * Execute get_investments tool
   */
  private async executeGetInvestments(
    toolCall: ToolCall,
    userId: string
  ): Promise<ToolExecutionResult> {
    const parseResult = getInvestmentsParamsSchema.safeParse(toolCall.arguments);

    if (!parseResult.success) {
      return createErrorResult(
        toolCall,
        new Error(`Invalid parameters: ${parseResult.error.message}`)
      );
    }

    this.logger.debug('get_investments params: (none)');

    const { investments } = await this.investmentsService.findAll(userId, {});

    const formattedInvestments = investments.map((inv) => {
      const currentAmount = parseFloat(inv.currentAmount);
      const goalAmount = inv.goalAmount ? parseFloat(inv.goalAmount) : null;
      const monthlyContribution = inv.monthlyContribution ? parseFloat(inv.monthlyContribution) : null;
      const progress = goalAmount !== null && goalAmount > 0
        ? Math.round((currentAmount / goalAmount) * 100)
        : null;
      const remainingToGoal = goalAmount !== null ? goalAmount - currentAmount : null;
      const monthsToGoal = remainingToGoal !== null && monthlyContribution !== null && monthlyContribution > 0
        ? Math.ceil(remainingToGoal / monthlyContribution)
        : null;

      return {
        id: inv.id,
        name: inv.name,
        type: inv.type,
        currentAmount,
        goalAmount,
        monthlyContribution,
        deadline: inv.deadline ?? null,
        currency: inv.currency,
        progress,
        remainingToGoal,
        monthsToGoal,
      };
    });

    // Calculate summary
    const totalCurrentAmount = formattedInvestments.reduce((sum, i) => sum + i.currentAmount, 0);
    const totalGoalAmount = formattedInvestments
      .filter((i) => i.goalAmount !== null)
      .reduce((sum, i) => sum + (i.goalAmount ?? 0), 0);
    const totalMonthlyContribution = formattedInvestments
      .filter((i) => i.monthlyContribution !== null)
      .reduce((sum, i) => sum + (i.monthlyContribution ?? 0), 0);
    const investmentsWithProgress = formattedInvestments.filter((i) => i.progress !== null);
    const averageProgress = investmentsWithProgress.length > 0
      ? Math.round(
          investmentsWithProgress.reduce((sum, i) => sum + (i.progress ?? 0), 0) /
            investmentsWithProgress.length
        )
      : 0;

    const summary = {
      totalCurrentAmount,
      totalGoalAmount,
      totalMonthlyContribution,
      averageProgress,
      count: formattedInvestments.length,
    };

    this.logger.log(
      `get_investments returned ${String(formattedInvestments.length)} investments`
    );

    return createSuccessResult(toolCall, {
      investments: formattedInvestments,
      summary,
    });
  }

  /**
   * Helper to calculate next due date based on due day
   * Uses timezone-aware calculation for accurate date
   */
  private getNextDueDate(dueDay: number, timezone: string): string {
    const daysUntil = getDaysUntilDueDay(dueDay, timezone);
    const today = getTodayInTimezone(timezone);
    const todayDate = new Date(today + 'T12:00:00'); // Use noon to avoid DST issues
    todayDate.setDate(todayDate.getDate() + daysUntil);

    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
