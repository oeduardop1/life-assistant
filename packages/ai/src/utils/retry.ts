/**
 * Retry utility with exponential backoff for LLM API calls.
 * @module utils/retry
 */

import { LLMAPIError, RateLimitError } from '../errors/ai.errors.js';

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier (e.g., 2 for doubling) */
  backoffMultiplier: number;
  /** Custom function to determine if error is retryable */
  shouldRetry?: (error: Error) => boolean;
  /** Callback called before each retry */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

/**
 * Default retry configuration for AI operations.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
};

/**
 * Determines if an error is retryable.
 *
 * Retryable errors include:
 * - Rate limit errors (429)
 * - Server errors (5xx)
 * - Timeout errors
 * - Network connection errors
 *
 * @param error - Error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Check custom error types
  if (error instanceof RateLimitError) {
    return true;
  }

  if (error instanceof LLMAPIError) {
    return error.isRetryable;
  }

  // Check error message patterns
  const message = error.message.toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('socket hang up') ||
    message.includes('network') ||
    message.includes('temporarily unavailable')
  );
}

/**
 * Calculates delay with exponential backoff and jitter.
 *
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: initialDelay * multiplier^(attempt-1)
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (±10%) to prevent thundering herd
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * Retries a function with exponential backoff.
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const response = await retryWithBackoff(
 *   () => llm.chat({ messages }),
 *   {
 *     maxAttempts: 3,
 *     initialDelayMs: 1000,
 *     onRetry: (error, attempt) => {
 *       console.log(`Retry ${attempt}: ${error.message}`);
 *     },
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const shouldRetry = fullConfig.shouldRetry ?? isRetryableError;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (attempt >= fullConfig.maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay
      let delayMs = calculateDelay(attempt, fullConfig);

      // If rate limit error has retry-after, use it
      if (lastError instanceof RateLimitError && lastError.retryAfterMs) {
        delayMs = Math.max(delayMs, lastError.retryAfterMs);
      }

      // Call onRetry callback
      fullConfig.onRetry?.(lastError, attempt, delayMs);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError ?? new Error('Retry failed with no error');
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a function to automatically retry on failure.
 *
 * @param fn - Function to wrap
 * @param config - Retry configuration
 * @returns Wrapped function with retry behavior
 *
 * @example
 * ```typescript
 * const robustChat = withRetry(
 *   (params: ChatParams) => llm.chat(params),
 *   { maxAttempts: 3 }
 * );
 *
 * const response = await robustChat({ messages });
 * ```
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: Partial<RetryConfig> = {},
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retryWithBackoff(() => fn(...args), config);
}
