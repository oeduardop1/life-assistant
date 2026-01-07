/**
 * Schema combinado de todas as configurações de ambiente
 */

import type { z } from 'zod';
import { appSchema, type AppEnv } from './app';
import { databaseSchema, type DatabaseEnv } from './database';
import { redisSchema, type RedisEnv } from './redis';
import { aiSchema, type AiEnv } from './ai';
import { storageSchema, type StorageEnv } from './storage';
import { integrationsSchema, type IntegrationsEnv } from './integrations';
import { observabilitySchema, type ObservabilityEnv } from './observability';

/**
 * Schema combinado de todas as variáveis de ambiente
 * Combina schemas individuais usando extend e intersection
 */
export const envSchema = appSchema
  .extend(databaseSchema.shape)
  .extend(redisSchema.shape)
  .extend(storageSchema.shape)
  .extend(integrationsSchema.shape)
  .extend(observabilitySchema.shape)
  .and(aiSchema);

export type EnvConfig = z.infer<typeof envSchema>;

// Re-export schemas individuais para testes e uso avançado
export {
  appSchema,
  databaseSchema,
  redisSchema,
  aiSchema,
  storageSchema,
  integrationsSchema,
  observabilitySchema,
};

// Re-export tipos
export type {
  AppEnv,
  DatabaseEnv,
  RedisEnv,
  AiEnv,
  StorageEnv,
  IntegrationsEnv,
  ObservabilityEnv,
};
