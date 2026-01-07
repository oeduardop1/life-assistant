/**
 * Schema de configuração de observabilidade
 */

import { z } from 'zod';

export const observabilitySchema = z.object({
  SENTRY_DSN: z.url().optional(),
  AXIOM_TOKEN: z.string().optional(),
  AXIOM_DATASET: z.string().default('life-assistant'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type ObservabilityEnv = z.infer<typeof observabilitySchema>;
