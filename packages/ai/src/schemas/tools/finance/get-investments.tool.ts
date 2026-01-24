/**
 * get_investments tool definition.
 * Returns all investments with full details and progress.
 * @module schemas/tools/finance/get-investments.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the get_investments tool.
 */
export const getInvestmentsParamsSchema = z.object({});

export type GetInvestmentsParams = z.infer<typeof getInvestmentsParamsSchema>;

/**
 * get_investments tool definition.
 *
 * Used to list ALL investments with full details (name, type, current amount, goal, monthly contribution, deadline, progress).
 * Investments are not tied to a specific month.
 * This is a READ tool - does not require user confirmation.
 */
export const getInvestmentsTool: ToolDefinition<typeof getInvestmentsParamsSchema> = {
  name: 'get_investments',
  description: 'Retorna TODOS os investimentos com detalhes completos (nome, tipo, valor atual, meta, aporte mensal, prazo, progresso). Use para ver progresso de investimentos, calcular metas, ou analisar portfolio.',
  parameters: getInvestmentsParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    {},
  ],
};
