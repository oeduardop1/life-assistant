/**
 * Schema de configuração de storage (Cloudflare R2 / MinIO)
 */

import { z } from 'zod';

export const storageSchema = z.object({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1).default('life-assistant'),
  R2_ENDPOINT: z.url().optional(),
});

export type StorageEnv = z.infer<typeof storageSchema>;
