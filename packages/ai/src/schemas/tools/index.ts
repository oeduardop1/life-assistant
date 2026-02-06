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
  recordMetricTool,
  recordMetricParamsSchema,
  type RecordMetricParams,
} from './record-metric.tool.js';

export {
  recordHabitTool,
  recordHabitParamsSchema,
  type RecordHabitParams,
} from './record-habit.tool.js';

export {
  getHabitsTool,
  getHabitsParamsSchema,
  type GetHabitsParams,
} from './get-habits.tool.js';

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
  getPendingBillsTool,
  getPendingBillsParamsSchema,
  getBillsTool,
  getBillsParamsSchema,
  getExpensesTool,
  getExpensesParamsSchema,
  getIncomesTool,
  getIncomesParamsSchema,
  getInvestmentsTool,
  getInvestmentsParamsSchema,
  markBillPaidTool,
  markBillPaidParamsSchema,
  createExpenseTool,
  createExpenseParamsSchema,
  getDebtProgressTool,
  getDebtProgressParamsSchema,
  getDebtPaymentHistoryTool,
  getDebtPaymentHistoryParamsSchema,
  getUpcomingInstallmentsTool,
  getUpcomingInstallmentsParamsSchema,
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
import { recordMetricTool } from './record-metric.tool.js';
import { recordHabitTool } from './record-habit.tool.js';
import { getHabitsTool } from './get-habits.tool.js';
import { updateMetricTool } from './update-metric.tool.js';
import { deleteMetricTool } from './delete-metric.tool.js';
import { addKnowledgeTool } from './add-knowledge.tool.js';
import { createReminderTool } from './create-reminder.tool.js';
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
  getDebtPaymentHistoryTool,
  getUpcomingInstallmentsTool,
} from './finance/index.js';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * All available tools.
 * READ tools: search_knowledge, get_tracking_history, get_habits, analyze_context, get_finance_summary, get_pending_bills, get_bills, get_expenses, get_incomes, get_investments, get_debt_progress, get_debt_payment_history, get_upcoming_installments
 * WRITE tools: record_metric, update_metric, delete_metric, record_habit, add_knowledge, create_reminder, mark_bill_paid, create_expense
 *
 * Note: delete_metrics (batch) was removed - LLM hallucinates entry IDs.
 * Parallel delete_metric calls work correctly and are confirmed together.
 *
 * Note: Person tools (get_person, update_person) were removed - people info is
 * stored as Knowledge Items with type='person' via Memory Consolidation.
 */
export const allTools: ToolDefinition[] = [
  // Memory tools
  searchKnowledgeTool,
  addKnowledgeTool,
  analyzeContextTool,
  // Tracking tools (M2.1)
  recordMetricTool,
  getTrackingHistoryTool,
  updateMetricTool,
  deleteMetricTool,
  // Habits tools (M2.1)
  recordHabitTool,
  getHabitsTool,
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
  getDebtPaymentHistoryTool,
  getUpcomingInstallmentsTool,
];

/**
 * READ-only tools (no confirmation required).
 */
export const readTools: ToolDefinition[] = [
  searchKnowledgeTool,
  getTrackingHistoryTool,
  analyzeContextTool,
  // Habits READ tools (M2.1)
  getHabitsTool,
  // Finance READ tools (M2.2)
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
 * WRITE tools (confirmation required).
 */
export const writeTools: ToolDefinition[] = [
  recordMetricTool,
  updateMetricTool,
  deleteMetricTool,
  // Habits WRITE tools (M2.1)
  recordHabitTool,
  addKnowledgeTool,
  createReminderTool,
  // Finance WRITE tools (M2.2)
  markBillPaidTool,
  createExpenseTool,
];
