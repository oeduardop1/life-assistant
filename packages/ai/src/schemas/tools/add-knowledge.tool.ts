/**
 * add_knowledge tool definition.
 * Adds a new fact learned about the user.
 * @module schemas/tools/add-knowledge.tool
 */

import { z } from 'zod';
import { LifeArea } from '@life-assistant/shared';
import type { ToolDefinition } from '../../ports/llm.port.js';
import { knowledgeTypeSchema } from './search-knowledge.tool.js';

/**
 * Parameters for the add_knowledge tool.
 */
export const addKnowledgeParamsSchema = z.object({
  type: knowledgeTypeSchema.describe('Type of knowledge: fact, preference, memory, insight, or person'),
  content: z.string().min(1).describe('The fact or preference to be recorded'),
  area: z.nativeEnum(LifeArea).optional().describe('Life area this knowledge relates to'),
  confidence: z.number().min(0).max(1).default(0.9).describe('Confidence score (0-1). Use 0.9+ for explicit facts, 0.7+ for inferences'),
});

export type AddKnowledgeParams = z.infer<typeof addKnowledgeParamsSchema>;

/**
 * add_knowledge tool definition.
 *
 * Used to add a new fact learned about the user.
 * This is a WRITE tool - requires user confirmation.
 */
export const addKnowledgeTool: ToolDefinition<typeof addKnowledgeParamsSchema> = {
  name: 'add_knowledge',
  description:
    'Add a new fact, preference, or insight learned about the user. Use this to record important information that should be remembered.',
  parameters: addKnowledgeParamsSchema,
  requiresConfirmation: true,
  inputExamples: [
    { type: 'fact', content: 'Works as a software developer', area: LifeArea.CAREER, confidence: 1.0 },
    { type: 'preference', content: 'Prefers to wake up early', area: LifeArea.HEALTH, confidence: 0.9 },
    { type: 'insight', content: 'Tends to spend more when stressed', area: LifeArea.FINANCIAL, confidence: 0.7 },
  ],
};
