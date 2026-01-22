/**
 * get_pending_bills tool definition.
 * Returns pending fixed bills for the month.
 * @module schemas/tools/finance/get-pending-bills.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the get_pending_bills tool.
 */
export const getPendingBillsParamsSchema = z.object({
  month: z.number().min(1).max(12).optional()
    .describe('Mes (1-12). Se omitido, usa mes atual'),
  year: z.number().min(2020).max(2100).optional()
    .describe('Ano. Se omitido, usa ano atual'),
});

export type GetPendingBillsParams = z.infer<typeof getPendingBillsParamsSchema>;

/**
 * get_pending_bills tool definition.
 *
 * Used to list pending fixed bills for the month.
 * This is a READ tool - does not require user confirmation.
 */
export const getPendingBillsTool: ToolDefinition<typeof getPendingBillsParamsSchema> = {
  name: 'get_pending_bills',
  description: 'Retorna contas fixas pendentes de pagamento no mes. Use para lembrar o usuario de contas a pagar ou verificar status de pagamentos.',
  parameters: getPendingBillsParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    {},
    { month: 1, year: 2026 },
  ],
};
