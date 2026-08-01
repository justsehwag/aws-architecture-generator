/**
 * Generic exponential backoff retry utility.
 * Validates: Requirements 13.1, 13.4
 *
 * Retries a function with exponential backoff:
 * - Starting delay: 1s
 * - Multiplier: 2x
 * - Max attempts: 3 (default)
 * - Delays: 1s, 2s, 4s
 */

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Multiplier for each subsequent delay (default: 2) */
  multiplier?: number;
  /** Optional abort signal to cancel retries */
  signal?: AbortSignal;
  /** Optional predicate to determine if an error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Optional callback invoked before each retry */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'signal' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  multiplier: 2,
  isRetryable: () => true,
};

/**
 * Waits for a specified duration, respecting an optional abort signal.
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);

    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Retries an async function with exponential backoff.
 *
 * @param fn - The async function to retry
 * @param options - Configuration for retry behavior
 * @returns The result of the function on success
 * @throws The last error if all attempts fail, or AbortError if cancelled
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    initialDelayMs,
    multiplier,
    isRetryable,
  } = { ...DEFAULT_OPTIONS, ...options };
  const { signal, onRetry } = options ?? {};

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt >= maxAttempts) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryable(error)) {
        break;
      }

      // Don't retry on abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      const delayMs = initialDelayMs * Math.pow(multiplier, attempt - 1);
      onRetry?.(attempt, error, delayMs);
      await delay(delayMs, signal);
    }
  }

  throw lastError;
}
