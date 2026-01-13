/**
 * update_person tool definition.
 * Updates information about a person in the user's CRM.
 * @module schemas/tools/update-person.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the update_person tool.
 */
export const updatePersonParamsSchema = z.object({
  name: z.string().min(1).describe('Name of the person to update'),
  updates: z.object({
    relationship: z.string().optional().describe('Relationship type (e.g., spouse, friend, colleague)'),
    notes: z.string().optional().describe('Notes about the person'),
    birthday: z.string().optional().describe('Birthday in YYYY-MM-DD format'),
    preferences: z.record(z.string()).optional().describe('Key-value pairs of preferences'),
  }).describe('Fields to update'),
});

export type UpdatePersonParams = z.infer<typeof updatePersonParamsSchema>;

/**
 * update_person tool definition.
 *
 * Used to update information about a person in the user's CRM.
 * This is a WRITE tool - requires user confirmation.
 */
export const updatePersonTool: ToolDefinition<typeof updatePersonParamsSchema> = {
  name: 'update_person',
  description:
    "Update information about a person in the user's personal CRM. Can update relationship, notes, birthday, or preferences.",
  parameters: updatePersonParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    { name: 'Maria', updates: { relationship: 'spouse', birthday: '1990-05-15' } },
    { name: 'João', updates: { notes: 'Prefers morning meetings' } },
    { name: 'Ana', updates: { preferences: { ideal_gift: 'books' } } },
  ],
};
