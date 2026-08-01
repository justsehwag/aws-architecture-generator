import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from './exponential-backoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first successful call', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const promise = retryWithBackoff(fn);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns result on subsequent success', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('success');

    const promise = retryWithBackoff(fn);

    // Advance past the first delay (1000ms)
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('applies exponential backoff delays: 1s, 2s, 4s', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('success');

    const onRetry = vi.fn();
    const promise = retryWithBackoff(fn, { onRetry });

    // First retry after 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Second retry after 2000ms
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 1000);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 2000);
  });

  it('throws after max attempts exhausted (default: 3)', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.reject(new Error('persistent failure'));
    });

    const promise = retryWithBackoff(fn);

    // Advance past delay 1 (1000ms) and delay 2 (2000ms)
    await vi.advanceTimersByTimeAsync(1100);
    await vi.advanceTimersByTimeAsync(2100);

    await expect(promise).rejects.toThrow('persistent failure');
    expect(callCount).toBe(3);
  });

  it('does not retry when isRetryable returns false', async () => {
    const nonRetryableError = new Error('not retryable');
    const fn = vi.fn().mockRejectedValue(nonRetryableError);

    const promise = retryWithBackoff(fn, {
      isRetryable: () => false,
    });

    await expect(promise).rejects.toThrow('not retryable');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects custom maxAttempts', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.reject(new Error('fail'));
    });

    const promise = retryWithBackoff(fn, { maxAttempts: 2 });

    await vi.advanceTimersByTimeAsync(1100);

    await expect(promise).rejects.toThrow('fail');
    expect(callCount).toBe(2);
  });

  it('respects custom initial delay and multiplier', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const onRetry = vi.fn();
    const promise = retryWithBackoff(fn, {
      initialDelayMs: 500,
      multiplier: 3,
      onRetry,
    });

    await vi.advanceTimersByTimeAsync(500);

    const result = await promise;
    expect(result).toBe('ok');
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 500);
  });

  it('throws AbortError immediately when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const fn = vi.fn().mockResolvedValue('should not reach');

    await expect(
      retryWithBackoff(fn, { signal: controller.signal })
    ).rejects.toThrow('Aborted');
    expect(fn).not.toHaveBeenCalled();
  });

  it('aborts during delay when signal fires', async () => {
    const controller = new AbortController();
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.reject(new Error('fail'));
    });

    const promise = retryWithBackoff(fn, { signal: controller.signal });

    // Let the first attempt fail, then abort during delay
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow('Aborted');
    expect(callCount).toBe(1);
  });
});
