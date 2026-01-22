/**
 * get_finance_summary tool definition.
 * Retrieves financial summary with KPIs, pending bills, and upcoming installments.
 * @module schemas/tools/finance/get-finance-summary.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Period enum for finance summary.
 */
export const financePeriodSchema = z.enum(['current_month', 'last_month', 'year']);
export type FinancePeriod = z.infer<typeof financePeriodSchema>;

/**
 * Parameters for the get_finance_summary tool.
 */
export const getFinanceSummaryParamsSchema = z.object({
  period: financePeriodSchema.default('current_month')
    .describe('Periodo do resumo: mes atual, mes anterior ou ano'),
});

export type GetFinanceSummaryParams = z.infer<typeof getFinanceSummaryParamsSchema>;

/**
 * get_finance_summary tool definition.
 *
 * Used to get financial summary with KPIs, pending bills, and debt metrics.
 * This is a READ tool - does not require user confirmation.
 */
export const getFinanceSummaryTool: ToolDefinition<typeof getFinanceSummaryParamsSchema> = {
  name: 'get_finance_summary',
  description: 'Obtem resumo financeiro com KPIs, contas pendentes e parcelas proximas. Use quando o usuario perguntar sobre financas, orcamento, contas ou situacao financeira.',
  parameters: getFinanceSummaryParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { period: 'current_month' },
    { period: 'last_month' },
    { period: 'year' },
  ],
};
