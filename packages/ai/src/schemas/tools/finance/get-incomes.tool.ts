/**
 * get_incomes tool definition.
 * Returns all income sources with full details for the month.
 * @module schemas/tools/finance/get-incomes.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the get_incomes tool.
 */
export const getIncomesParamsSchema = z.object({
  month: z.number().min(1).max(12).optional()
    .describe('Mes (1-12). Se omitido, usa mes atual'),
  year: z.number().min(2020).max(2100).optional()
    .describe('Ano. Se omitido, usa ano atual'),
});

export type GetIncomesParams = z.infer<typeof getIncomesParamsSchema>;

/**
 * get_incomes tool definition.
 *
 * Used to list ALL income sources with full details (name, type, frequency, expected vs actual).
 * This is a READ tool - does not require user confirmation.
 */
export const getIncomesTool: ToolDefinition<typeof getIncomesParamsSchema> = {
  name: 'get_incomes',
  description: 'Retorna TODAS as rendas com detalhes completos (nome, tipo, frequencia, previsto, real). Use para ver fontes de renda individuais, verificar recebimentos, ou analisar previsto vs real.',
  parameters: getIncomesParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    {},
    { month: 1, year: 2026 },
  ],
};
