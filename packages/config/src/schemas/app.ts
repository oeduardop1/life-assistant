/**
 * Schema de configuração da aplicação
 */

import { z } from 'zod';

export const appSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  APP_VERSION: z.string().default('0.1.0'),
});

export type AppEnv = z.infer<typeof appSchema>;
