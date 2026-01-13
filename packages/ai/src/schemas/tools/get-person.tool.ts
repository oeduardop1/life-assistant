/**
 * get_person tool definition.
 * Gets information about a person from the user's CRM.
 * @module schemas/tools/get-person.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the get_person tool.
 */
export const getPersonParamsSchema = z.object({
  name: z.string().min(1).describe('Name of the person to look up'),
});

export type GetPersonParams = z.infer<typeof getPersonParamsSchema>;

/**
 * get_person tool definition.
 *
 * Used to get information about a person from the user's CRM.
 * This is a READ tool - does not require user confirmation.
 */
export const getPersonTool: ToolDefinition<typeof getPersonParamsSchema> = {
  name: 'get_person',
  description:
    "Get information about a person from the user's personal CRM. Returns relationship type, notes, birthday, and other stored information.",
  parameters: getPersonParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { name: 'Maria' },
    { name: 'João da Silva' },
  ],
};
