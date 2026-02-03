/**
 * get_habits tool definition.
 * Gets the user's habits with optional streak and completion info.
 * @module schemas/tools/get-habits.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the get_habits tool.
 */
export const getHabitsParamsSchema = z.object({
  includeStreaks: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include current streak and longest streak for each habit'),
  includeCompletionsToday: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include whether each habit was completed today'),
});

export type GetHabitsParams = z.infer<typeof getHabitsParamsSchema>;

/**
 * get_habits tool definition.
 *
 * Used to get the user's list of habits with optional streak and completion info.
 * This is a READ tool - does not require user confirmation.
 *
 * @see docs/specs/domains/tracking.md §7.5 for spec
 */
export const getHabitsTool: ToolDefinition<typeof getHabitsParamsSchema> = {
  name: 'get_habits',
  description: `Obtém a lista de hábitos do usuário.

    RETORNA para cada hábito:
    - id: UUID do hábito
    - name: nome do hábito
    - icon: emoji/ícone
    - frequency: frequência (daily, weekdays, weekends, custom)
    - periodOfDay: período do dia (morning, afternoon, evening, anytime)
    - currentStreak: sequência atual de dias (se includeStreaks=true)
    - longestStreak: maior sequência já alcançada (se includeStreaks=true)
    - completedToday: se foi concluído hoje (se includeCompletionsToday=true)

    Use este tool para entender quais hábitos o usuário tem antes de usar record_habit.`,
  parameters: getHabitsParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { includeStreaks: true, includeCompletionsToday: true },
    { includeStreaks: true, includeCompletionsToday: false },
    { includeStreaks: false, includeCompletionsToday: true },
  ],
};
