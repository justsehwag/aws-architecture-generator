/**
 * API client wrapper that applies exponential backoff retry logic.
 * Validates: Requirements 13.1, 13.4
 *
 * Only retries on:
 * - 5xx server errors (transient)
 * - Network failures (no response)
 *
 * Does NOT retry on:
 * - 4xx client errors (non-transient)
 */

import { retryWithBackoff, type RetryOptions } from './exponential-backoff';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Determines whether an error should trigger a retry.
 * Only 5xx errors and network failures are retryable.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode >= 500;
  }
  if (error instanceof NetworkError) {
    return true;
  }
  return false;
}

export interface ApiClientOptions {
  /** Base URL for all requests (default: '') */
  baseUrl?: string;
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>;
  /** Retry configuration overrides */
  retryOptions?: Partial<RetryOptions>;
  /** Request timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
}

export interface RequestOptions extends Omit<RequestInit, 'signal'> {
  /** Override retry options for this request */
  retryOptions?: Partial<RetryOptions>;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Override timeout for this request */
  timeoutMs?: number;
}

/**
 * Creates a fetch-based API client with automatic retry logic.
 */
export function createApiClient(clientOptions?: ApiClientOptions) {
  const {
    baseUrl = '',
    defaultHeaders = {},
    retryOptions: defaultRetryOptions = {},
    timeoutMs: defaultTimeoutMs = 15000,
  } = clientOptions ?? {};

  async function request<T = unknown>(
    url: string,
    options?: RequestOptions
  ): Promise<T> {
    const {
      retryOptions: requestRetryOptions,
      signal: externalSignal,
      timeoutMs = defaultTimeoutMs,
      headers: requestHeaders,
      ...fetchOptions
    } = options ?? {};

    const mergedRetryOptions: Partial<RetryOptions> = {
      ...defaultRetryOptions,
      ...requestRetryOptions,
      isRetryable: isRetryableError,
      signal: externalSignal,
    };

    const fullUrl = `${baseUrl}${url}`;
    const headers = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
      ...(requestHeaders as Record<string, string>),
    };

    return retryWithBackoff<T>(async () => {
      // Create a timeout controller that respects the external signal
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

      // If external signal aborts, also abort the timeout controller
      if (externalSignal) {
        if (externalSignal.aborted) {
          clearTimeout(timeoutId);
          throw new DOMException('Aborted', 'AbortError');
        }
        externalSignal.addEventListener(
          'abort',
          () => timeoutController.abort(),
          { once: true }
        );
      }

      try {
        const response = await fetch(fullUrl, {
          ...fetchOptions,
          headers,
          signal: timeoutController.signal,
        });

        if (!response.ok) {
          let body: unknown;
          try {
            body = await response.json();
          } catch {
            body = await response.text().catch(() => undefined);
          }
          throw new ApiError(
            `Request failed with status ${response.status}`,
            response.status,
            body
          );
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return (await response.json()) as T;
        }
        return (await response.text()) as unknown as T;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Check if this was a timeout or external abort
          if (externalSignal?.aborted) {
            throw error;
          }
          throw new NetworkError('Request timed out');
        }
        if (error instanceof TypeError) {
          // fetch throws TypeError on network failures
          throw new NetworkError('Network connection failed');
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }, mergedRetryOptions);
  }

  return {
    get: <T = unknown>(url: string, options?: RequestOptions) =>
      request<T>(url, { ...options, method: 'GET' }),

    post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
      request<T>(url, {
        ...options,
        method: 'POST',
        body: body != null ? JSON.stringify(body) : undefined,
      }),

    put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
      request<T>(url, {
        ...options,
        method: 'PUT',
        body: body != null ? JSON.stringify(body) : undefined,
      }),

    delete: <T = unknown>(url: string, options?: RequestOptions) =>
      request<T>(url, { ...options, method: 'DELETE' }),
  };
}

/** Default API client instance */
export const apiClient = createApiClient();
