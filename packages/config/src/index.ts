/**
 * @life-assistant/config
 * Configuração e validação de variáveis de ambiente via Zod
 */

// Version
export const CONFIG_VERSION = '0.1.0';

// Loader
export { loadConfig, getConfig, clearConfigCache } from './loader';

// Validator
export { validateEnv, isEnvValid } from './validator';

// Types
export type {
  EnvConfig,
  AppEnv,
  DatabaseEnv,
  RedisEnv,
  AiEnv,
  StorageEnv,
  IntegrationsEnv,
  ObservabilityEnv,
} from './schemas';

// Schemas (para uso avançado/testes)
export {
  envSchema,
  appSchema,
  databaseSchema,
  redisSchema,
  aiSchema,
  storageSchema,
  integrationsSchema,
  observabilitySchema,
} from './schemas';
