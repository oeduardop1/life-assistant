/**
 * search_knowledge tool definition.
 * Searches for facts, preferences, or insights about the user.
 * @module schemas/tools/search-knowledge.tool
 */

import { z } from 'zod';
import { LifeArea } from '@life-assistant/shared';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Knowledge item types that can be searched.
 */
export const knowledgeTypeSchema = z.enum([
  'fact',
  'preference',
  'memory',
  'insight',
  'person',
]);

export type KnowledgeType = z.infer<typeof knowledgeTypeSchema>;

/**
 * Parameters for the search_knowledge tool.
 */
export const searchKnowledgeParamsSchema = z.object({
  query: z.string().min(1).describe('What to search for'),
  type: knowledgeTypeSchema.optional().describe('Type of knowledge item to filter by'),
  area: z.nativeEnum(LifeArea).optional().describe('Life area to filter by'),
  limit: z.number().min(1).max(10).default(5).describe('Maximum number of results to return'),
});

export type SearchKnowledgeParams = z.infer<typeof searchKnowledgeParamsSchema>;

/**
 * search_knowledge tool definition.
 *
 * Used to search for facts, preferences, or insights about the user.
 * This is a READ tool - does not require user confirmation.
 */
export const searchKnowledgeTool: ToolDefinition<typeof searchKnowledgeParamsSchema> = {
  name: 'search_knowledge',
  description:
    'Search for facts, preferences, or insights about the user. Use when you need additional context not present in the user memory.',
  parameters: searchKnowledgeParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    { query: 'weight goal', type: 'fact', area: LifeArea.HEALTH, limit: 5 },
    { query: 'food preferences', type: 'preference', limit: 5 },
    { query: 'Maria', type: 'person', limit: 1 },
    { query: 'work habits', area: LifeArea.CAREER, limit: 3 },
  ],
};
