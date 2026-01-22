/**
 * create_expense tool definition.
 * Creates a new variable expense.
 * @module schemas/tools/finance/create-expense.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../../ports/llm.port.js';

/**
 * Expense category enum.
 */
export const expenseCategorySchema = z.enum([
  'alimentacao',
  'transporte',
  'lazer',
  'saude',
  'educacao',
  'vestuario',
  'outros',
]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

/**
 * Parameters for the create_expense tool.
 */
export const createExpenseParamsSchema = z.object({
  name: z.string().min(1).max(100)
    .describe('Nome da despesa'),
  category: expenseCategorySchema
    .describe('Categoria da despesa'),
  budgetedAmount: z.number().positive().optional()
    .describe('Valor orcado (planejado)'),
  actualAmount: z.number().positive().optional()
    .describe('Valor real gasto'),
  isRecurring: z.boolean().optional().default(false)
    .describe('Se e despesa recorrente mensal'),
});

export type CreateExpenseParams = z.infer<typeof createExpenseParamsSchema>;

/**
 * create_expense tool definition.
 *
 * Used to create a new variable expense.
 * This is a WRITE tool - requires user confirmation via system interception.
 */
export const createExpenseTool: ToolDefinition<typeof createExpenseParamsSchema> = {
  name: 'create_expense',
  description: 'Cria uma nova despesa variavel. Use quando o usuario mencionar um gasto ou quiser registrar uma despesa.',
  parameters: createExpenseParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    { name: 'Mercado', category: 'alimentacao', actualAmount: 450.00, isRecurring: false },
    { name: 'Uber', category: 'transporte', budgetedAmount: 200, actualAmount: 180, isRecurring: true },
  ],
};
