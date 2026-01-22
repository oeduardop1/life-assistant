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

// Convenience arrays for finance tools
import { getFinanceSummaryTool } from './get-finance-summary.tool.js';
import { getPendingBillsTool } from './get-pending-bills.tool.js';
import { markBillPaidTool } from './mark-bill-paid.tool.js';
import { createExpenseTool } from './create-expense.tool.js';
import { getDebtProgressTool } from './get-debt-progress.tool.js';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * All finance tools.
 */
export const financeTools: ToolDefinition[] = [
  getFinanceSummaryTool,
  getPendingBillsTool,
  markBillPaidTool,
  createExpenseTool,
  getDebtProgressTool,
];

/**
 * Finance READ tools (no confirmation required).
 */
export const financeReadTools: ToolDefinition[] = [
  getFinanceSummaryTool,
  getPendingBillsTool,
  getDebtProgressTool,
];

/**
 * Finance WRITE tools (confirmation required).
 */
export const financeWriteTools: ToolDefinition[] = [
  markBillPaidTool,
  createExpenseTool,
];
