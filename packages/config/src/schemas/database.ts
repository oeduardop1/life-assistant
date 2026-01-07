/**
 * Schema de configuração do banco de dados
 */

import { z } from 'zod';

export const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1).refine(
    (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
    { message: 'DATABASE_URL must start with postgresql:// or postgres://' }
  ),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(32, {
    message: 'SUPABASE_JWT_SECRET must be at least 32 characters',
  }),
});

export type DatabaseEnv = z.infer<typeof databaseSchema>;
