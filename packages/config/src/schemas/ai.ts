/**
 * Schema de configuração de IA/LLM
 * Usa discriminated union para validar API keys condicionalmente
 */

import { z } from 'zod';

const geminiSchema = z.object({
  LLM_PROVIDER: z.literal('gemini'),
  GEMINI_API_KEY: z.string().min(1, { message: 'GEMINI_API_KEY is required when LLM_PROVIDER is gemini' }),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash-exp'),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().optional(),
});

const claudeSchema = z.object({
  LLM_PROVIDER: z.literal('claude'),
  ANTHROPIC_API_KEY: z.string().min(1, { message: 'ANTHROPIC_API_KEY is required when LLM_PROVIDER is claude' }),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-20250514'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
});

export const aiSchema = z.discriminatedUnion('LLM_PROVIDER', [geminiSchema, claudeSchema]);

export type AiEnv = z.infer<typeof aiSchema>;
