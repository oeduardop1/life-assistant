/**
 * Validador de ambiente para CI/CD
 */

import { envSchema } from './schemas';

/**
 * Valida variáveis de ambiente para CI/CD
 * Imprime erros e sai com código 1 se inválido
 */
export function validateEnv(): void {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    result.error.issues.forEach((issue) => {
      // Path is always populated for our schema's object properties
      const path = issue.path.join('.');
      console.error(`  - ${path}: ${issue.message}`);
    });
    process.exit(1);
  }

  console.log('Environment validation passed');
}

/**
 * Valida e retorna boolean (não sai do processo)
 * Útil para testes e validação programática
 */
export function isEnvValid(): boolean {
  const result = envSchema.safeParse(process.env);
  return result.success;
}
