/**
 * Rate limiter for LLM API calls.
 * Implements token bucket algorithm with requests and tokens limits.
 * @module utils/rate-limiter
 */

/**
 * Configuration for rate limiter.
 */
export interface RateLimiterConfig {
  /** Maximum requests per minute */
  maxRequestsPerMinute: number;
  /** Maximum tokens per minute */
  maxTokensPerMinute: number;
}

/**
 * Default rate limits (conservative defaults for free tier).
 */
export const DEFAULT_RATE_LIMITS: RateLimiterConfig = {
  maxRequestsPerMinute: 60,
  maxTokensPerMinute: 100_000,
};

/**
 * Rate limiter for controlling LLM API request frequency.
 *
 * Implements a sliding window rate limiter that tracks both
 * requests per minute and tokens per minute.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({
 *   maxRequestsPerMinute: 60,
 *   maxTokensPerMinute: 100000,
 * });
 *
 * // Before making a request
 * await limiter.checkAndWait(1000); // estimated tokens
 *
 * // After getting response
 * limiter.recordActualUsage(850); // actual tokens used
 * ```
 */
export class RateLimiter {
  private requestTimestamps: number[] = [];
  private tokenCounts: { timestamp: number; tokens: number }[] = [];
  private readonly config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMITS, ...config };
  }

  /**
   * Check rate limits and wait if necessary.
   *
   * @param estimatedTokens - Estimated tokens for the upcoming request
   * @returns Promise that resolves when it's safe to make the request
   */
  async checkAndWait(estimatedTokens: number): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // Clean old entries
    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => t > oneMinuteAgo,
    );
    this.tokenCounts = this.tokenCounts.filter((t) => t.timestamp > oneMinuteAgo);

    // Check request limit
    if (this.requestTimestamps.length >= this.config.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      if (oldestRequest !== undefined) {
        const waitTime = oldestRequest + 60_000 - now;
        if (waitTime > 0) {
          await this.sleep(waitTime);
          // Recurse after waiting to recheck limits
          return this.checkAndWait(estimatedTokens);
        }
      }
    }

    // Check token limit
    const currentTokens = this.tokenCounts.reduce(
      (sum, t) => sum + t.tokens,
      0,
    );
    if (currentTokens + estimatedTokens > this.config.maxTokensPerMinute) {
      const oldestToken = this.tokenCounts[0];
      if (oldestToken) {
        const waitTime = oldestToken.timestamp + 60_000 - now;
        if (waitTime > 0) {
          await this.sleep(waitTime);
          // Recurse after waiting to recheck limits
          return this.checkAndWait(estimatedTokens);
        }
      }
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
    this.tokenCounts.push({ timestamp: Date.now(), tokens: estimatedTokens });
  }

  /**
   * Record actual token usage after a request completes.
   * Updates the last entry with actual token count.
   *
   * @param tokens - Actual number of tokens used
   */
  recordActualUsage(tokens: number): void {
    const lastEntry = this.tokenCounts[this.tokenCounts.length - 1];
    if (lastEntry) {
      lastEntry.tokens = tokens;
    }
  }

  /**
   * Get current usage statistics.
   */
  getUsage(): { requests: number; tokens: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    const requests = this.requestTimestamps.filter(
      (t) => t > oneMinuteAgo,
    ).length;
    const tokens = this.tokenCounts
      .filter((t) => t.timestamp > oneMinuteAgo)
      .reduce((sum, t) => sum + t.tokens, 0);

    return { requests, tokens };
  }

  /**
   * Get remaining capacity.
   */
  getRemaining(): { requests: number; tokens: number } {
    const usage = this.getUsage();
    return {
      requests: Math.max(0, this.config.maxRequestsPerMinute - usage.requests),
      tokens: Math.max(0, this.config.maxTokensPerMinute - usage.tokens),
    };
  }

  /**
   * Reset the rate limiter.
   */
  reset(): void {
    this.requestTimestamps = [];
    this.tokenCounts = [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Creates a singleton rate limiter for a provider.
 */
const limiters = new Map<string, RateLimiter>();

/**
 * Get or create a rate limiter for a specific provider.
 *
 * @param provider - Provider name ('gemini' | 'claude')
 * @param config - Optional configuration override
 * @returns RateLimiter instance
 */
export function getRateLimiter(
  provider: string,
  config?: Partial<RateLimiterConfig>,
): RateLimiter {
  const existing = limiters.get(provider);
  if (existing) {
    return existing;
  }
  const newLimiter = new RateLimiter(config);
  limiters.set(provider, newLimiter);
  return newLimiter;
}

/**
 * Reset all rate limiters.
 */
export function resetAllRateLimiters(): void {
  for (const limiter of limiters.values()) {
    limiter.reset();
  }
  limiters.clear();
}
