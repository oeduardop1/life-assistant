/**
 * Tool definitions for LLM Tool Use.
 * @module schemas/tools
 */

// Re-export all tool definitions
export {
  searchKnowledgeTool,
  searchKnowledgeParamsSchema,
  knowledgeTypeSchema,
  type SearchKnowledgeParams,
  type KnowledgeType,
} from './search-knowledge.tool.js';

export {
  getTrackingHistoryTool,
  getTrackingHistoryParamsSchema,
  type GetTrackingHistoryParams,
} from './get-tracking-history.tool.js';

export {
  getPersonTool,
  getPersonParamsSchema,
  type GetPersonParams,
} from './get-person.tool.js';

export {
  recordMetricTool,
  recordMetricParamsSchema,
  type RecordMetricParams,
} from './record-metric.tool.js';

export {
  updateMetricTool,
  updateMetricParamsSchema,
  type UpdateMetricParams,
} from './update-metric.tool.js';

export {
  deleteMetricTool,
  deleteMetricParamsSchema,
  type DeleteMetricParams,
} from './delete-metric.tool.js';

// delete_metrics (batch) tool was removed - LLM hallucinates entry IDs
// Parallel delete_metric calls work correctly and are confirmed together

export {
  addKnowledgeTool,
  addKnowledgeParamsSchema,
  type AddKnowledgeParams,
} from './add-knowledge.tool.js';

export {
  createReminderTool,
  createReminderParamsSchema,
  type CreateReminderParams,
} from './create-reminder.tool.js';

export {
  updatePersonTool,
  updatePersonParamsSchema,
  type UpdatePersonParams,
} from './update-person.tool.js';

export {
  analyzeContextTool,
  analyzeContextParamsSchema,
  analyzeContextResponseSchema,
  type AnalyzeContextParams,
  type AnalyzeContextResponse,
} from './analyze-context.tool.js';

// Finance tools (M2.2)
export {
  getFinanceSummaryTool,
  getFinanceSummaryParamsSchema,
  financePeriodSchema,
  type GetFinanceSummaryParams,
  type FinancePeriod,
  getPendingBillsTool,
  getPendingBillsParamsSchema,
  type GetPendingBillsParams,
  getBillsTool,
  getBillsParamsSchema,
  type GetBillsParams,
  getExpensesTool,
  getExpensesParamsSchema,
  type GetExpensesParams,
  getIncomesTool,
  getIncomesParamsSchema,
  type GetIncomesParams,
  getInvestmentsTool,
  getInvestmentsParamsSchema,
  type GetInvestmentsParams,
  markBillPaidTool,
  markBillPaidParamsSchema,
  type MarkBillPaidParams,
  createExpenseTool,
  createExpenseParamsSchema,
  expenseCategorySchema,
  type CreateExpenseParams,
  type ExpenseCategory,
  getDebtProgressTool,
  getDebtProgressParamsSchema,
  type GetDebtProgressParams,
  financeTools,
  financeReadTools,
  financeWriteTools,
} from './finance/index.js';

// Confirmation detection tool (not in allTools - used with forced toolChoice)
export {
  respondToConfirmationTool,
  respondToConfirmationParamsSchema,
  confirmationIntentSchema,
  type RespondToConfirmationParams,
  type ConfirmationIntent,
} from './respond-to-confirmation.tool.js';

// Convenience array of all tools
import { searchKnowledgeTool } from './search-knowledge.tool.js';
import { getTrackingHistoryTool } from './get-tracking-history.tool.js';
import { getPersonTool } from './get-person.tool.js';
import { recordMetricTool } from './record-metric.tool.js';
import { updateMetricTool } from './update-metric.tool.js';
import { deleteMetricTool } from './delete-metric.tool.js';
import { addKnowledgeTool } from './add-knowledge.tool.js';
import { createReminderTool } from './create-reminder.tool.js';
import { updatePersonTool } from './update-person.tool.js';
import { analyzeContextTool } from './analyze-context.tool.js';
// Finance tools (M2.2)
import {
  getFinanceSummaryTool,
  getPendingBillsTool,
  getBillsTool,
  getExpensesTool,
  getIncomesTool,
  getInvestmentsTool,
  markBillPaidTool,
  createExpenseTool,
  getDebtProgressTool,
} from './finance/index.js';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * All available tools.
 * READ tools: search_knowledge, get_tracking_history, get_person, analyze_context, get_finance_summary, get_pending_bills, get_bills, get_expenses, get_incomes, get_investments, get_debt_progress
 * WRITE tools: record_metric, update_metric, delete_metric, add_knowledge, create_reminder, update_person, mark_bill_paid, create_expense
 *
 * Note: delete_metrics (batch) was removed - LLM hallucinates entry IDs.
 * Parallel delete_metric calls work correctly and are confirmed together.
 */
export const allTools: ToolDefinition[] = [
  // Memory tools
  searchKnowledgeTool,
  addKnowledgeTool,
  analyzeContextTool,
  // Person tools
  getPersonTool,
  updatePersonTool,
  // Tracking tools (M2.1)
  recordMetricTool,
  getTrackingHistoryTool,
  updateMetricTool,
  deleteMetricTool,
  // Reminder tools
  createReminderTool,
  // Finance tools (M2.2)
  getFinanceSummaryTool,
  getPendingBillsTool,
  getBillsTool,
  getExpensesTool,
  getIncomesTool,
  getInvestmentsTool,
  markBillPaidTool,
  createExpenseTool,
  getDebtProgressTool,
];

/**
 * READ-only tools (no confirmation required).
 */
export const readTools: ToolDefinition[] = [
  searchKnowledgeTool,
  getTrackingHistoryTool,
  getPersonTool,
  analyzeContextTool,
  // Finance READ tools (M2.2)
  getFinanceSummaryTool,
  getPendingBillsTool,
  getBillsTool,
  getExpensesTool,
  getIncomesTool,
  getInvestmentsTool,
  getDebtProgressTool,
];

/**
 * WRITE tools (confirmation required).
 */
export const writeTools: ToolDefinition[] = [
  recordMetricTool,
  updateMetricTool,
  deleteMetricTool,
  addKnowledgeTool,
  createReminderTool,
  updatePersonTool,
  // Finance WRITE tools (M2.2)
  markBillPaidTool,
  createExpenseTool,
];
