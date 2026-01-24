/**
 * get_bills tool definition.
 * Returns all fixed bills with full details for the month.
 * @module schemas/tools/finance/get-bills.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the get_bills tool.
 */
export const getBillsParamsSchema = z.object({
  month: z.number().min(1).max(12).optional()
    .describe('Mes (1-12). Se omitido, usa mes atual'),
  year: z.number().min(2020).max(2100).optional()
    .describe('Ano. Se omitido, usa ano atual'),
  status: z.enum(['all', 'pending', 'paid', 'overdue']).default('all')
    .describe('Filtro de status. Default: todas'),
});

export type GetBillsParams = z.infer<typeof getBillsParamsSchema>;

/**
 * get_bills tool definition.
 *
 * Used to list ALL fixed bills with full details (name, category, amount, due day, status, paid date).
 * This is a READ tool - does not require user confirmation.
 */
export const getBillsTool: ToolDefinition<typeof getBillsParamsSchema> = {
  name: 'get_bills',
  description: 'Retorna TODAS as contas fixas com detalhes completos (nome, categoria, valor, vencimento, status, data pagamento). Use para ver contas individuais, verificar quais foram pagas, ou analisar gastos fixos.',
  parameters: getBillsParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { status: 'all' },
    { month: 1, year: 2026, status: 'all' },
    { status: 'pending' },
    { month: 2, year: 2026, status: 'paid' },
  ],
};
