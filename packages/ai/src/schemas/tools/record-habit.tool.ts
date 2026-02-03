/**
 * record_habit tool definition.
 * Records a habit completion for the user.
 * @module schemas/tools/record-habit.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the record_habit tool.
 */
export const recordHabitParamsSchema = z.object({
  habitName: z
    .string()
    .min(1)
    .describe('Name of the habit to mark as completed (fuzzy match supported)'),
  date: z
    .string()
    .optional()
    .describe('ISO date string (YYYY-MM-DD) for the completion. Defaults to today.'),
  notes: z.string().optional().describe('Optional notes about the completion'),
});

export type RecordHabitParams = z.infer<typeof recordHabitParamsSchema>;

/**
 * record_habit tool definition.
 *
 * Used to mark a habit as completed for a specific date.
 * Uses fuzzy matching to find the habit by name.
 * Confirmation is handled via system interception (ADR-015).
 *
 * @see docs/specs/domains/tracking.md §7.2 for spec
 */
export const recordHabitTool: ToolDefinition<typeof recordHabitParamsSchema> = {
  name: 'record_habit',
  description: `Marca um hábito como concluído para uma data específica.

    O sistema faz fuzzy match do nome do hábito informado com os hábitos cadastrados.
    Se não encontrar correspondência exata, sugere o hábito mais similar.
    O sistema pedirá confirmação do usuário antes de registrar.`,
  parameters: recordHabitParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    { habitName: 'Treino', date: '2026-01-07' },
    { habitName: 'Leitura' }, // Uses today's date
    { habitName: 'Meditação', date: '2026-01-07', notes: '15 minutos de manhã' },
  ],
};
