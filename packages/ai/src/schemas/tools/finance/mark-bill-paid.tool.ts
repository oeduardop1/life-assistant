/**
 * mark_bill_paid tool definition.
 * Marks a fixed bill as paid for the month.
 * @module schemas/tools/finance/mark-bill-paid.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Parameters for the mark_bill_paid tool.
 */
export const markBillPaidParamsSchema = z.object({
  billId: z.string().uuid()
    .describe('ID da conta fixa (UUID)'),
  month: z.number().min(1).max(12).optional()
    .describe('Mes do pagamento. Se omitido, usa mes atual'),
  year: z.number().min(2020).max(2100).optional()
    .describe('Ano do pagamento. Se omitido, usa ano atual'),
});

export type MarkBillPaidParams = z.infer<typeof markBillPaidParamsSchema>;

/**
 * mark_bill_paid tool definition.
 *
 * Used to mark a fixed bill as paid.
 * This is a WRITE tool - requires user confirmation via system interception.
 */
export const markBillPaidTool: ToolDefinition<typeof markBillPaidParamsSchema> = {
  name: 'mark_bill_paid',
  description: 'Marca uma conta fixa como paga no mes. Use quando o usuario informar que pagou uma conta especifica.',
  parameters: markBillPaidParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    { billId: '123e4567-e89b-12d3-a456-426614174000' },
    { billId: '123e4567-e89b-12d3-a456-426614174000', month: 1, year: 2026 },
  ],
};
