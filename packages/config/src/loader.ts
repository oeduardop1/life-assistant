/**
 * Carregador de configuração com cache
 */

import type { ZodError } from 'zod';
import { envSchema, type EnvConfig } from './schemas';

let cachedConfig: EnvConfig | null = null;

/**
 * Formata erros do Zod para mensagens legíveis
 * Não expõe valores de variáveis (segurança)
 * @internal Exported for testing
 */
export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');
}

/**
 * Carrega e valida configuração do ambiente
 * @throws Error se variáveis obrigatórias estiverem faltando ou inválidas
 */
export function loadConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const message = `Invalid environment configuration:\n${formatZodError(result.error)}`;
    throw new Error(message);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

/**
 * Retorna config cacheado ou carrega se necessário
 */
export function getConfig(): EnvConfig {
  return cachedConfig ?? loadConfig();
}

/**
 * Limpa cache (útil para testes)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
