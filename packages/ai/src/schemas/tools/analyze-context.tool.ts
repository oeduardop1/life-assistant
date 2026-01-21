/**
 * analyze_context tool definition.
 * Analyzes context to find connections, patterns, and contradictions.
 * @module schemas/tools/analyze-context.tool
 * @see ADR-014 for Real-time Inference architecture
 */

import { z } from 'zod';
import { LifeArea } from '@life-assistant/shared';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Parameters for the analyze_context tool.
 */
export const analyzeContextParamsSchema = z.object({
  currentTopic: z
    .string()
    .describe('The main topic the user is currently discussing'),
  relatedAreas: z
    .array(z.nativeEnum(LifeArea))
    .min(1)
    .max(4)
    .describe('Life areas that might be related to this topic'),
  lookForContradictions: z
    .boolean()
    .default(true)
    .describe('Whether to check for contradictions with existing knowledge'),
});

export type AnalyzeContextParams = z.infer<typeof analyzeContextParamsSchema>;

/**
 * Response schema for analyze_context results.
 * Used for documentation and type safety.
 */
export const analyzeContextResponseSchema = z.object({
  relatedFacts: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      content: z.string(),
      confidence: z.number(),
      area: z.nativeEnum(LifeArea).optional(),
    })
  ),
  existingPatterns: z.array(
    z.object({
      pattern: z.string(),
      confidence: z.number(),
      evidence: z.array(z.string()),
    })
  ),
  potentialConnections: z.array(z.string()),
  contradictions: z.array(
    z.object({
      existingFact: z.string(),
      currentStatement: z.string(),
      suggestion: z.string(),
    })
  ),
});

export type AnalyzeContextResponse = z.infer<typeof analyzeContextResponseSchema>;

/**
 * analyze_context tool definition.
 *
 * Used to analyze context before responding to important personal topics.
 * Searches for related facts, patterns, and potential contradictions.
 * This is a READ tool - does not require user confirmation.
 *
 * @see ADR-014 for Real-time Inference architecture
 */
export const analyzeContextTool: ToolDefinition<typeof analyzeContextParamsSchema> = {
  name: 'analyze_context',
  description:
    'REQUIRED before responding to personal topics. Call this tool FIRST when user mentions: relationships, work, health, finances, emotions, or important decisions. Returns facts from memory to help detect contradictions (e.g., user said single before but now mentions dating) and find relevant connections.',
  parameters: analyzeContextParamsSchema,
  requiresConfirmation: false,
  inputExamples: [
    // User mentions ending a relationship - check for contradictions
    // ADR-017: MENTAL_HEALTH is now a sub-area of HEALTH
    {
      currentTopic: 'ending relationship or breakup',
      relatedAreas: [LifeArea.RELATIONSHIPS, LifeArea.HEALTH],
      lookForContradictions: true,
    },
    // User mentions sleep problems - might connect to stress/finances
    // ADR-017: FINANCIAL renamed to FINANCE
    {
      currentTopic: 'sleeping problems or insomnia',
      relatedAreas: [LifeArea.HEALTH, LifeArea.FINANCE],
      lookForContradictions: true,
    },
    // User mentions upcoming meeting - check for anxiety patterns
    // ADR-017: CAREER renamed to PROFESSIONAL
    {
      currentTopic: 'important meeting or presentation',
      relatedAreas: [LifeArea.PROFESSIONAL, LifeArea.HEALTH],
      lookForContradictions: false,
    },
    // User mentions quitting job
    {
      currentTopic: 'quitting job or career change',
      relatedAreas: [LifeArea.PROFESSIONAL, LifeArea.FINANCE, LifeArea.HEALTH],
      lookForContradictions: true,
    },
    // User mentions debt or financial worry
    {
      currentTopic: 'debt or financial stress',
      relatedAreas: [LifeArea.FINANCE, LifeArea.HEALTH],
      lookForContradictions: true,
    },
  ],
};
