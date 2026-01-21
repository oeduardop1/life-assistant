/**
 * add_knowledge tool definition.
 * Adds a new fact learned about the user.
 * @module schemas/tools/add-knowledge.tool
 */

import { z } from 'zod';
import { LifeArea, SubArea } from '@life-assistant/shared';
import type { ToolDefinition } from '../../ports/llm.port.js';
import { knowledgeTypeSchema } from './search-knowledge.tool.js';

/**
 * Parameters for the add_knowledge tool.
 * ADR-017: Added subArea for hierarchical organization.
 */
export const addKnowledgeParamsSchema = z.object({
  type: knowledgeTypeSchema.describe('Type of knowledge: fact, preference, memory, insight, or person'),
  content: z.string().min(1).describe('The fact or preference to be recorded'),
  area: z.nativeEnum(LifeArea).optional().describe('Life area: health, finance, professional, learning, spiritual, relationships'),
  subArea: z.nativeEnum(SubArea).optional().describe('Sub-area for more specific categorization (e.g., physical, mental, budget, career)'),
  confidence: z.number().min(0).max(1).default(0.9).describe('Confidence score (0-1). Use 0.9+ for explicit facts, 0.7+ for inferences'),
});

export type AddKnowledgeParams = z.infer<typeof addKnowledgeParamsSchema>;

/**
 * add_knowledge tool definition.
 *
 * Used to add a new fact learned about the user.
 * Executes automatically without confirmation (AI confirms in response text).
 */
export const addKnowledgeTool: ToolDefinition<typeof addKnowledgeParamsSchema> = {
  name: 'add_knowledge',
  description:
    'Add a new fact, preference, or insight learned about the user. IMPORTANT: Always include the "area" field to categorize the knowledge properly. This enables finding related facts later. NOTE: Contradictions are automatically detected and resolved - if a new fact contradicts an existing one in the same area/type (e.g., "is single" vs "is in a relationship"), the older fact is automatically superseded. The response will include supersession info when this happens.',
  parameters: addKnowledgeParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { type: 'fact', content: 'Is single and lives alone', area: LifeArea.RELATIONSHIPS, subArea: SubArea.ROMANTIC, confidence: 1.0 },
    { type: 'fact', content: 'Works as a software developer', area: LifeArea.PROFESSIONAL, subArea: SubArea.CAREER, confidence: 1.0 },
    { type: 'preference', content: 'Prefers to wake up early', area: LifeArea.HEALTH, subArea: SubArea.PHYSICAL, confidence: 0.9 },
    { type: 'fact', content: 'Has R$5000 credit card debt', area: LifeArea.FINANCE, subArea: SubArea.DEBTS, confidence: 1.0 },
    { type: 'insight', content: 'Tends to spend more when stressed', area: LifeArea.FINANCE, subArea: SubArea.BUDGET, confidence: 0.7 },
    { type: 'fact', content: 'Struggles with anxiety', area: LifeArea.HEALTH, subArea: SubArea.MENTAL, confidence: 0.9 },
  ],
};
