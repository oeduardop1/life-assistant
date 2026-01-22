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
  markBillPaidParamsSchema,
  createExpenseParamsSchema,
  getDebtProgressParamsSchema,
} from '@life-assistant/ai';
import { FinanceSummaryService } from './finance-summary.service';
import { BillsService } from './bills.service';
import { VariableExpensesService } from './variable-expenses.service';
import { DebtsService } from './debts.service';

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
    private readonly debtsService: DebtsService
  ) {}

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

        case 'get_debt_progress':
          return await this.executeGetDebtProgress(toolCall, userId);

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

    // Map period to monthYear
    let monthYear: string | undefined;
    const now = new Date();

    switch (period) {
      case 'current_month':
        monthYear = now.toISOString().slice(0, 7); // YYYY-MM
        break;
      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        monthYear = lastMonth.toISOString().slice(0, 7);
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
      debts: {
        totalDebts: summary.debts.totalDebts,
        monthlyInstallment: summary.debts.monthlyInstallmentSum,
        totalPaid: summary.debts.totalPaid,
        totalRemaining: summary.debts.totalRemaining,
        negotiatedCount: summary.debts.negotiatedCount,
        pendingNegotiationCount: summary.debts.totalDebts - summary.debts.negotiatedCount,
      },
      billsCount: summary.billsCount,
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

    // Default to current month/year
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();
    const monthYear = `${String(targetYear)}-${String(targetMonth).padStart(2, '0')}`;

    this.logger.debug(`get_pending_bills params: monthYear=${monthYear}`);

    // Get all bills with pending/overdue status
    const { bills } = await this.billsService.findAll(userId, {
      monthYear,
      status: 'pending', // Will also include overdue via date logic
    });

    // Calculate due status for each bill
    const today = new Date();
    const formattedBills = bills.map((bill) => {
      const dueDate = new Date(targetYear, targetMonth - 1, bill.dueDay);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
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

    // Create the expense
    const expense = await this.variableExpensesService.create(userId, {
      name,
      category: dbCategory as 'food' | 'transport' | 'housing' | 'health' | 'education' | 'entertainment' | 'shopping' | 'bills' | 'subscriptions' | 'travel' | 'gifts' | 'investments' | 'other',
      expectedAmount: String(budgetedAmount ?? actualAmount ?? 0),
      actualAmount: String(actualAmount ?? 0),
      isRecurring,
      monthYear: new Date().toISOString().slice(0, 7),
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

    const { debtId } = parseResult.data;

    this.logger.debug(`get_debt_progress params: debtId=${debtId ?? 'all'}`);

    if (debtId) {
      // Get specific debt
      const debt = await this.debtsService.findById(userId, debtId);

      const totalAmount = parseFloat(debt.totalAmount);
      const installmentAmount = debt.installmentAmount
        ? parseFloat(debt.installmentAmount)
        : 0;
      const paidInstallments = debt.currentInstallment;
      const totalInstallments = debt.totalInstallments ?? 0;
      const remainingInstallments = totalInstallments - paidInstallments;
      const totalPaid = installmentAmount * paidInstallments;
      const totalRemaining = totalAmount - totalPaid;
      const percentComplete =
        totalInstallments > 0
          ? Math.round((paidInstallments / totalInstallments) * 100)
          : 0;

      return createSuccessResult(toolCall, {
        debts: [
          {
            id: debt.id,
            name: debt.name,
            creditor: debt.creditor ?? undefined,
            totalAmount,
            installmentAmount,
            totalInstallments,
            paidInstallments,
            remainingInstallments,
            totalPaid,
            totalRemaining,
            percentComplete,
            nextDueDate: debt.dueDay
              ? this.getNextDueDate(debt.dueDay)
              : undefined,
            isNegotiated: debt.isNegotiated,
          },
        ],
        summary: {
          totalDebts: 1,
          totalPaid,
          totalRemaining,
          averageProgress: percentComplete,
        },
      });
    }

    // Get all debts
    const { debts } = await this.debtsService.findAll(userId, {});

    const formattedDebts = debts.map((debt) => {
      const totalAmount = parseFloat(debt.totalAmount);
      const installmentAmount = debt.installmentAmount
        ? parseFloat(debt.installmentAmount)
        : 0;
      const paidInstallments = debt.currentInstallment;
      const totalInstallments = debt.totalInstallments ?? 0;
      const remainingInstallments = totalInstallments - paidInstallments;
      const totalPaid = installmentAmount * paidInstallments;
      const totalRemaining = totalAmount - totalPaid;
      const percentComplete =
        totalInstallments > 0
          ? Math.round((paidInstallments / totalInstallments) * 100)
          : 0;

      return {
        id: debt.id,
        name: debt.name,
        creditor: debt.creditor ?? undefined,
        totalAmount,
        installmentAmount,
        totalInstallments,
        paidInstallments,
        remainingInstallments,
        totalPaid,
        totalRemaining,
        percentComplete,
        nextDueDate: debt.dueDay ? this.getNextDueDate(debt.dueDay) : undefined,
        isNegotiated: debt.isNegotiated,
      };
    });

    // Calculate summary
    const totalPaid = formattedDebts.reduce((sum, d) => sum + d.totalPaid, 0);
    const totalRemaining = formattedDebts.reduce(
      (sum, d) => sum + d.totalRemaining,
      0
    );
    const averageProgress =
      formattedDebts.length > 0
        ? Math.round(
            formattedDebts.reduce((sum, d) => sum + d.percentComplete, 0) /
              formattedDebts.length
          )
        : 0;

    this.logger.log(
      `get_debt_progress returned ${String(formattedDebts.length)} debts`
    );

    return createSuccessResult(toolCall, {
      debts: formattedDebts,
      summary: {
        totalDebts: formattedDebts.length,
        totalPaid,
        totalRemaining,
        averageProgress,
      },
    });
  }

  /**
   * Helper to calculate next due date based on due day
   */
  private getNextDueDate(dueDay: number): string {
    const now = new Date();
    const currentDay = now.getDate();

    let nextDueDate: Date;
    if (currentDay <= dueDay) {
      // Due date is this month
      nextDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
    } else {
      // Due date is next month
      nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
    }

    const dateStr = nextDueDate.toISOString().split('T')[0];
    return dateStr ?? '';
  }
}
