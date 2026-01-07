/**
 * Utilitários assíncronos
 */

/**
 * Aguarda um período de tempo
 *
 * @param ms - Milissegundos para aguardar
 * @returns Promise que resolve após o tempo especificado
 *
 * @example
 * await sleep(100); // Aguarda 100ms
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Opções para retry
 */
export interface RetryOptions {
  /** Número máximo de tentativas (default: 3) */
  maxAttempts?: number;
  /** Delay inicial em ms (default: 100) */
  initialDelayMs?: number;
  /** Delay máximo em ms (default: 5000) */
  maxDelayMs?: number;
  /** Multiplicador do backoff (default: 2) */
  backoffMultiplier?: number;
  /** Função que determina se deve tentar novamente (default: sempre true) */
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Executa uma função com retry e exponential backoff
 *
 * @param fn - Função assíncrona a ser executada
 * @param options - Opções de retry
 * @returns Resultado da função
 * @throws Erro da última tentativa se todas falharem
 *
 * @example
 * const result = await retry(
 *   () => fetchData(),
 *   { maxAttempts: 5, shouldRetry: (err) => err.message.includes('timeout') }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error = new Error('No attempts made');
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}
