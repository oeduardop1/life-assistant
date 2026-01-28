/**
 * get_debt_payment_history tool definition.
 * Returns payment history for a specific debt.
 * @module schemas/tools/finance/get-debt-payment-history.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the get_debt_payment_history tool.
 */
export const getDebtPaymentHistoryParamsSchema = z.object({
  debtId: z.string().uuid()
    .describe('ID da divida para consultar historico de pagamentos.'),
  limit: z.number().int().min(1).max(100).optional()
    .describe('Limite de pagamentos a retornar (max 100). Padrao: 50.'),
});

export type GetDebtPaymentHistoryParams = z.infer<typeof getDebtPaymentHistoryParamsSchema>;

/**
 * get_debt_payment_history tool definition.
 *
 * Used to get payment history for a specific debt, including:
 * - All recorded payments with installment numbers
 * - Which month each installment belongs to (belongsToMonthYear)
 * - When each payment was actually made (paidAt)
 * - Whether payment was made early (paidEarly flag)
 *
 * This is a READ tool - does not require user confirmation.
 */
export const getDebtPaymentHistoryTool: ToolDefinition<typeof getDebtPaymentHistoryParamsSchema> = {
  name: 'get_debt_payment_history',
  description: 'Retorna historico de pagamentos de uma divida especifica. Inclui parcelas pagas, quando foram pagas, e se foram pagas antecipadamente. Use quando perguntarem sobre pagamentos ja feitos.',
  parameters: getDebtPaymentHistoryParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { debtId: '123e4567-e89b-12d3-a456-426614174000' },
    { debtId: '123e4567-e89b-12d3-a456-426614174000', limit: 10 },
  ],
};
