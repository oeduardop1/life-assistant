/**
 * Finance tool definitions for LLM Tool Use.
 * @module schemas/tools/finance
 */

// Re-export all finance tool definitions
export {
  getFinanceSummaryTool,
  getFinanceSummaryParamsSchema,
  financePeriodSchema,
  type GetFinanceSummaryParams,
  type FinancePeriod,
} from './get-finance-summary.tool.js';

export {
  getPendingBillsTool,
  getPendingBillsParamsSchema,
  type GetPendingBillsParams,
} from './get-pending-bills.tool.js';

export {
  getBillsTool,
  getBillsParamsSchema,
  type GetBillsParams,
} from './get-bills.tool.js';

export {
  getExpensesTool,
  getExpensesParamsSchema,
  type GetExpensesParams,
} from './get-expenses.tool.js';

export {
  getIncomesTool,
  getIncomesParamsSchema,
  type GetIncomesParams,
} from './get-incomes.tool.js';

export {
  getInvestmentsTool,
  getInvestmentsParamsSchema,
  type GetInvestmentsParams,
} from './get-investments.tool.js';

export {
  markBillPaidTool,
  markBillPaidParamsSchema,
  type MarkBillPaidParams,
} from './mark-bill-paid.tool.js';

export {
  createExpenseTool,
  createExpenseParamsSchema,
  expenseCategorySchema,
  type CreateExpenseParams,
  type ExpenseCategory,
} from './create-expense.tool.js';

export {
  getDebtProgressTool,
  getDebtProgressParamsSchema,
  type GetDebtProgressParams,
} from './get-debt-progress.tool.js';

export {
  getDebtPaymentHistoryTool,
  getDebtPaymentHistoryParamsSchema,
  type GetDebtPaymentHistoryParams,
} from './get-debt-payment-history.tool.js';

export {
  getUpcomingInstallmentsTool,
  getUpcomingInstallmentsParamsSchema,
  type GetUpcomingInstallmentsParams,
} from './get-upcoming-installments.tool.js';

// Convenience arrays for finance tools
import { getFinanceSummaryTool } from './get-finance-summary.tool.js';
import { getPendingBillsTool } from './get-pending-bills.tool.js';
import { getBillsTool } from './get-bills.tool.js';
import { getExpensesTool } from './get-expenses.tool.js';
import { getIncomesTool } from './get-incomes.tool.js';
import { getInvestmentsTool } from './get-investments.tool.js';
import { markBillPaidTool } from './mark-bill-paid.tool.js';
import { createExpenseTool } from './create-expense.tool.js';
import { getDebtProgressTool } from './get-debt-progress.tool.js';
import { getDebtPaymentHistoryTool } from './get-debt-payment-history.tool.js';
import { getUpcomingInstallmentsTool } from './get-upcoming-installments.tool.js';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * All finance tools.
 */
export const financeTools: ToolDefinition[] = [
  getFinanceSummaryTool,
  getPendingBillsTool,
  getBillsTool,
  getExpensesTool,
  getIncomesTool,
  getInvestmentsTool,
  markBillPaidTool,
  createExpenseTool,
  getDebtProgressTool,
  getDebtPaymentHistoryTool,
  getUpcomingInstallmentsTool,
];

/**
 * Finance READ tools (no confirmation required).
 */
export const financeReadTools: ToolDefinition[] = [
  getFinanceSummaryTool,
  getPendingBillsTool,
  getBillsTool,
  getExpensesTool,
  getIncomesTool,
  getInvestmentsTool,
  getDebtProgressTool,
  getDebtPaymentHistoryTool,
  getUpcomingInstallmentsTool,
];

/**
 * Finance WRITE tools (confirmation required).
 */
export const financeWriteTools: ToolDefinition[] = [
  markBillPaidTool,
  createExpenseTool,
];
