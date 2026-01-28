/**
 * get_upcoming_installments tool definition.
 * Returns debt installments due in a specific month with their payment status.
 * @module schemas/tools/finance/get-upcoming-installments.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the get_upcoming_installments tool.
 */
export const getUpcomingInstallmentsParamsSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional()
    .describe('Mes para consultar parcelas (YYYY-MM). Se omitido, usa o mes atual.'),
});

export type GetUpcomingInstallmentsParams = z.infer<typeof getUpcomingInstallmentsParamsSchema>;

/**
 * get_upcoming_installments tool definition.
 *
 * Used to get debt installments due in a specific month:
 * - Which debts have installments due
 * - Status of each installment (pending, paid, paid_early, overdue)
 * - Due day and amount for each
 * - Summary with totals and counts by status
 *
 * This is a READ tool - does not require user confirmation.
 */
export const getUpcomingInstallmentsTool: ToolDefinition<typeof getUpcomingInstallmentsParamsSchema> = {
  name: 'get_upcoming_installments',
  description: 'Retorna parcelas de dividas para um mes especifico, com status (pendente, paga, paga antecipadamente, vencida). Use quando perguntarem sobre vencimentos ou parcelas do mes.',
  parameters: getUpcomingInstallmentsParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    {},
    { monthYear: '2026-03' },
  ],
};
