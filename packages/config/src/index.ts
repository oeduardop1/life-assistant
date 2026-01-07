// @life-assistant/config
// Configuracoes e validacao de ENV
// Implementacao completa no milestone M0.3

export const CONFIG_VERSION = '0.1.0';

/**
 * Ambiente da aplicacao
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Configuracao base (placeholder)
 * Sera expandida com Zod no M0.3
 */
export interface AppConfig {
  env: Environment;
  port: number;
  frontendUrl: string;
}

/**
 * Retorna o ambiente atual
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV;
  if (env === 'production' || env === 'staging' || env === 'test') {
    return env;
  }
  return 'development';
}
