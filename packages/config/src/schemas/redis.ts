/**
 * Schema de configuração do Redis
 */

import { z } from 'zod';

export const redisSchema = z.object({
  REDIS_URL: z.string().min(1).refine(
    (val) => val.startsWith('redis://') || val.startsWith('rediss://'),
    { message: 'REDIS_URL must start with redis:// or rediss://' }
  ),
});

export type RedisEnv = z.infer<typeof redisSchema>;
