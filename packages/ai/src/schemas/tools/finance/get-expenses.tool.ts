/**
 * get_expenses tool definition.
 * Returns all variable expenses with full details for the month.
 * @module schemas/tools/finance/get-expenses.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the get_expenses tool.
 */
export const getExpensesParamsSchema = z.object({
  month: z.number().min(1).max(12).optional()
    .describe('Mes (1-12). Se omitido, usa mes atual'),
  year: z.number().min(2020).max(2100).optional()
    .describe('Ano. Se omitido, usa ano atual'),
});

export type GetExpensesParams = z.infer<typeof getExpensesParamsSchema>;

/**
 * get_expenses tool definition.
 *
 * Used to list ALL variable expenses with full details (name, category, budgeted vs actual, recurring/one-time).
 * This is a READ tool - does not require user confirmation.
 */
export const getExpensesTool: ToolDefinition<typeof getExpensesParamsSchema> = {
  name: 'get_expenses',
  description: 'Retorna TODAS as despesas variaveis com detalhes completos (nome, categoria, previsto, real, recorrente/pontual). Use para ver gastos individuais, comparar orcado vs real, ou analisar despesas por categoria.',
  parameters: getExpensesParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    {},
    { month: 1, year: 2026 },
  ],
};
