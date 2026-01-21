/**
 * search_knowledge tool definition.
 * Searches for facts, preferences, or insights about the user.
 * @module schemas/tools/search-knowledge.tool
 */

import { z } from 'zod';
import { LifeArea, SubArea } from '@life-assistant/shared';
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
 * ADR-017: Added subArea for hierarchical filtering.
 */
export const searchKnowledgeParamsSchema = z.object({
  query: z.string().optional().describe('Search query. If not provided, returns all recent items.'),
  type: knowledgeTypeSchema.optional().describe('Type of knowledge item to filter by'),
  area: z.nativeEnum(LifeArea).optional().describe('Life area: health, finance, professional, learning, spiritual, relationships'),
  subArea: z.nativeEnum(SubArea).optional().describe('Sub-area for more specific filtering (e.g., physical, mental, budget, career)'),
  limit: z.number().min(1).max(20).default(10).describe('Maximum number of results to return'),
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
    'Search for facts, preferences, or insights about the user. Call WITHOUT query parameter to get ALL recent knowledge items. Call WITH query to search for specific topics.',
  parameters: searchKnowledgeParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    // Get all recent items (for "what do you know about me?" questions)
    { limit: 10 },
    // Search for specific topics
    { query: 'weight goal', type: 'fact', area: LifeArea.HEALTH, subArea: SubArea.PHYSICAL, limit: 5 },
    { query: 'food preferences', type: 'preference', limit: 5 },
    { query: 'Maria', type: 'person', limit: 1 },
    { query: 'work habits', area: LifeArea.PROFESSIONAL, subArea: SubArea.CAREER, limit: 3 },
    { query: 'mood patterns', area: LifeArea.HEALTH, subArea: SubArea.MENTAL, limit: 5 },
    { query: 'budget status', area: LifeArea.FINANCE, subArea: SubArea.BUDGET, limit: 3 },
  ],
};
