/**
 * get_debt_progress tool definition.
 * Returns debt payment progress for negotiated debts.
 * @module schemas/tools/finance/get-debt-progress.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the get_debt_progress tool.
 */
export const getDebtProgressParamsSchema = z.object({
  debtId: z.string().uuid().optional()
    .describe('ID da divida especifica. Se omitido, retorna todas as dividas.'),
});

export type GetDebtProgressParams = z.infer<typeof getDebtProgressParamsSchema>;

/**
 * get_debt_progress tool definition.
 *
 * Used to get debt payment progress including paid/remaining installments.
 * This is a READ tool - does not require user confirmation.
 */
export const getDebtProgressTool: ToolDefinition<typeof getDebtProgressParamsSchema> = {
  name: 'get_debt_progress',
  description: 'Retorna progresso de pagamento das dividas negociadas. Inclui parcelas pagas, restantes e percentual de conclusao.',
  parameters: getDebtProgressParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    {},
    { debtId: '123e4567-e89b-12d3-a456-426614174000' },
  ],
};
