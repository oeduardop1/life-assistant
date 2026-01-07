import { describe, it, expect, vi } from 'vitest';
import { sleep, retry } from './async';

describe('sleep', () => {
  it('should resolve after specified time', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    expect(elapsed).toBeLessThan(200);
  });

  it('should resolve immediately with 0ms', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

describe('retry', () => {
  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should succeed after failures', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await retry(fn, { initialDelayMs: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(retry(fn, { maxAttempts: 3, initialDelayMs: 10 })).rejects.toThrow(
      'always fails',
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const start = Date.now();
    await retry(fn, { initialDelayMs: 50, backoffMultiplier: 2 });
    const elapsed = Date.now() - start;

    // Should wait 50ms + 100ms = 150ms (with tolerance)
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it('should respect maxDelayMs', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const start = Date.now();
    await retry(fn, {
      initialDelayMs: 100,
      maxDelayMs: 50,
      backoffMultiplier: 10,
    });
    const elapsed = Date.now() - start;

    // Should be capped at 50ms per delay
    expect(elapsed).toBeLessThan(200);
  });

  it('should respect shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));

    await expect(
      retry(fn, {
        maxAttempts: 5,
        initialDelayMs: 10,
        shouldRetry: (error) => !error.message.includes('non-retryable'),
      }),
    ).rejects.toThrow('non-retryable');

    // Should only try once because shouldRetry returns false
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass through successful result', async () => {
    const expectedResult = { data: 'test', count: 42 };
    const fn = vi.fn().mockResolvedValue(expectedResult);

    const result = await retry(fn);

    expect(result).toEqual(expectedResult);
  });

  it('should work with custom options', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('custom success');

    const result = await retry(fn, {
      maxAttempts: 5,
      initialDelayMs: 5,
      maxDelayMs: 100,
      backoffMultiplier: 1.5,
    });

    expect(result).toBe('custom success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should convert non-Error objects to Error', async () => {
    const fn = vi.fn().mockRejectedValue('string error');

    await expect(retry(fn, { maxAttempts: 1 })).rejects.toThrow('string error');
  });

  it('should throw with zero maxAttempts', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    await expect(retry(fn, { maxAttempts: 0 })).rejects.toThrow('No attempts made');
    expect(fn).not.toHaveBeenCalled();
  });
});
