import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryWithBackoff,
  isRetryableError,
  calculateDelay,
  withRetry,
  DEFAULT_RETRY_CONFIG,
} from './retry.js';
import { LLMAPIError, RateLimitError } from '../errors/ai.errors.js';

describe('isRetryableError', () => {
  it('should return true for RateLimitError', () => {
    const error = new RateLimitError('Rate limit exceeded');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for retryable LLMAPIError', () => {
    const error = new LLMAPIError('Server error', 500);
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return false for non-retryable LLMAPIError', () => {
    const error = new LLMAPIError('Bad request', 400);
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return true for rate limit message', () => {
    const error = new Error('rate limit exceeded');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for 429 status code in message', () => {
    const error = new Error('Request failed with status 429');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for 5xx errors', () => {
    expect(isRetryableError(new Error('Error 500'))).toBe(true);
    expect(isRetryableError(new Error('Error 502'))).toBe(true);
    expect(isRetryableError(new Error('Error 503'))).toBe(true);
    expect(isRetryableError(new Error('Error 504'))).toBe(true);
  });

  it('should return true for network errors', () => {
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
    expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true);
    expect(isRetryableError(new Error('socket hang up'))).toBe(true);
  });

  it('should return true for timeout errors', () => {
    expect(isRetryableError(new Error('Request timeout'))).toBe(true);
    expect(isRetryableError(new Error('Connection timed out'))).toBe(true);
  });

  it('should return false for validation errors', () => {
    const error = new Error('Invalid input');
    expect(isRetryableError(error)).toBe(false);
  });
});

describe('calculateDelay', () => {
  it('should calculate exponential backoff', () => {
    const config = {
      ...DEFAULT_RETRY_CONFIG,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
    };

    // Mock Math.random for consistent tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const delay1 = calculateDelay(1, config);
    const delay2 = calculateDelay(2, config);
    const delay3 = calculateDelay(3, config);

    // With jitter at 0.5, result should be base delay (no jitter adjustment)
    expect(delay1).toBe(1000);
    expect(delay2).toBe(2000);
    expect(delay3).toBe(4000);

    vi.restoreAllMocks();
  });

  it('should cap at maxDelayMs', () => {
    const config = {
      ...DEFAULT_RETRY_CONFIG,
      initialDelayMs: 1000,
      backoffMultiplier: 10,
      maxDelayMs: 5000,
    };

    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const delay = calculateDelay(3, config);
    expect(delay).toBe(5000);

    vi.restoreAllMocks();
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = retryWithBackoff(fn);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { maxAttempts: 3 });

    // Advance timers to allow retry
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts', async () => {
    // Use real timers with minimal delays for this test to avoid unhandled rejection warnings
    vi.useRealTimers();

    const error = new Error('rate limit');
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);

    await expect(
      retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 1,
        maxDelayMs: 1,
      })
    ).rejects.toThrow('rate limit');
    expect(fn).toHaveBeenCalledTimes(3);

    // Restore fake timers for subsequent tests
    vi.useFakeTimers();
  });

  it('should not retry non-retryable errors', async () => {
    const error = new Error('Invalid input');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(fn)).rejects.toThrow('Invalid input');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const error = new Error('rate limit');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    const onRetry = vi.fn();

    const promise = retryWithBackoff(fn, { maxAttempts: 3, onRetry });

    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledWith(error, 1, expect.any(Number));
  });

  it('should use custom shouldRetry function', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('custom error'))
      .mockResolvedValue('success');

    const shouldRetry = vi.fn().mockReturnValue(true);

    const promise = retryWithBackoff(fn, { maxAttempts: 3, shouldRetry });

    await vi.runAllTimersAsync();
    await promise;

    expect(shouldRetry).toHaveBeenCalled();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use retryAfterMs from RateLimitError', async () => {
    const error = new RateLimitError('Rate limit', 5000);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      maxAttempts: 2,
      initialDelayMs: 1000,
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should wrap function with retry behavior', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValue('success');

    const wrappedFn = withRetry(fn, { maxAttempts: 3 });

    const promise = wrappedFn();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments to wrapped function', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const wrappedFn = withRetry(fn);

    await wrappedFn('arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
