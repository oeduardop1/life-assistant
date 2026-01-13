/**
 * create_reminder tool definition.
 * Creates a reminder for the user.
 * @module schemas/tools/create-reminder.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the create_reminder tool.
 */
export const createReminderParamsSchema = z.object({
  title: z.string().min(1).describe('Title of the reminder'),
  datetime: z.string().describe('ISO datetime string when the reminder should trigger'),
  notes: z.string().optional().describe('Additional notes for the reminder'),
});

export type CreateReminderParams = z.infer<typeof createReminderParamsSchema>;

/**
 * create_reminder tool definition.
 *
 * Used to create a reminder for the user.
 * This is a WRITE tool - requires user confirmation.
 */
export const createReminderTool: ToolDefinition<typeof createReminderParamsSchema> = {
  name: 'create_reminder',
  description:
    'Create a reminder for the user. The reminder will be triggered at the specified date and time.',
  parameters: createReminderParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    { title: 'Meeting with client', datetime: '2026-01-15T10:00:00-03:00' },
    { title: 'Take medication', datetime: '2026-01-12T08:00:00-03:00', notes: 'Antibiotic' },
  ],
};
