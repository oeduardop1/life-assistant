import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RateLimiter,
  DEFAULT_RATE_LIMITS,
  getRateLimiter,
  resetAllRateLimiters,
} from './rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAllRateLimiters();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const limiter = new RateLimiter();
      const remaining = limiter.getRemaining();

      expect(remaining.requests).toBe(DEFAULT_RATE_LIMITS.maxRequestsPerMinute);
      expect(remaining.tokens).toBe(DEFAULT_RATE_LIMITS.maxTokensPerMinute);
    });

    it('should merge custom config with defaults', () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 10 });
      const remaining = limiter.getRemaining();

      expect(remaining.requests).toBe(10);
      expect(remaining.tokens).toBe(DEFAULT_RATE_LIMITS.maxTokensPerMinute);
    });
  });

  describe('checkAndWait', () => {
    it('should allow requests within limits', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 2 });

      await limiter.checkAndWait(100);
      await limiter.checkAndWait(100);

      const usage = limiter.getUsage();
      expect(usage.requests).toBe(2);
    });

    it('should track token usage', async () => {
      const limiter = new RateLimiter();

      await limiter.checkAndWait(500);
      await limiter.checkAndWait(300);

      const usage = limiter.getUsage();
      expect(usage.tokens).toBe(800);
    });
  });

  describe('recordActualUsage', () => {
    it('should update last entry with actual tokens', async () => {
      const limiter = new RateLimiter();

      await limiter.checkAndWait(1000); // estimated
      limiter.recordActualUsage(800); // actual

      const usage = limiter.getUsage();
      expect(usage.tokens).toBe(800);
    });

    it('should do nothing if no entries', () => {
      const limiter = new RateLimiter();

      // Should not throw
      limiter.recordActualUsage(100);

      const usage = limiter.getUsage();
      expect(usage.tokens).toBe(0);
    });
  });

  describe('getUsage', () => {
    it('should only count requests within the last minute', async () => {
      const limiter = new RateLimiter();

      await limiter.checkAndWait(100);

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61_000);

      const usage = limiter.getUsage();
      expect(usage.requests).toBe(0);
      expect(usage.tokens).toBe(0);
    });
  });

  describe('getRemaining', () => {
    it('should return remaining capacity', async () => {
      const limiter = new RateLimiter({
        maxRequestsPerMinute: 10,
        maxTokensPerMinute: 1000,
      });

      await limiter.checkAndWait(300);
      await limiter.checkAndWait(200);

      const remaining = limiter.getRemaining();
      expect(remaining.requests).toBe(8);
      expect(remaining.tokens).toBe(500);
    });

    it('should not return negative values', async () => {
      const limiter = new RateLimiter({
        maxRequestsPerMinute: 1,
        maxTokensPerMinute: 100,
      });

      await limiter.checkAndWait(150);

      const remaining = limiter.getRemaining();
      expect(remaining.requests).toBe(0);
      expect(remaining.tokens).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all tracked data', async () => {
      const limiter = new RateLimiter();

      await limiter.checkAndWait(500);
      await limiter.checkAndWait(500);

      limiter.reset();

      const usage = limiter.getUsage();
      expect(usage.requests).toBe(0);
      expect(usage.tokens).toBe(0);
    });
  });
});

describe('getRateLimiter', () => {
  beforeEach(() => {
    resetAllRateLimiters();
  });

  it('should return same instance for same provider', () => {
    const limiter1 = getRateLimiter('gemini');
    const limiter2 = getRateLimiter('gemini');

    expect(limiter1).toBe(limiter2);
  });

  it('should return different instances for different providers', () => {
    const gemini = getRateLimiter('gemini');
    const claude = getRateLimiter('claude');

    expect(gemini).not.toBe(claude);
  });

  it('should use custom config for new limiters', () => {
    const limiter = getRateLimiter('test', { maxRequestsPerMinute: 5 });

    const remaining = limiter.getRemaining();
    expect(remaining.requests).toBe(5);
  });
});

describe('resetAllRateLimiters', () => {
  it('should clear all singleton limiters', () => {
    const limiter1 = getRateLimiter('gemini');
    resetAllRateLimiters();
    const limiter2 = getRateLimiter('gemini');

    expect(limiter1).not.toBe(limiter2);
  });
});
