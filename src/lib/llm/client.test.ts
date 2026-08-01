import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLMWithRetry } from './client';
import {
  LLMConfig,
  LLMTimeoutError,
  LLMAPIError,
} from './types';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const testConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'test-key-123',
  model: 'gpt-4o',
  timeoutMs: 30000,
  maxRetries: 2,
};

const testMessages = [
  { role: 'system' as const, content: 'You are a helpful assistant.' },
  { role: 'user' as const, content: 'Generate an architecture.' },
];

describe('callLLMWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return LLM response on successful call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"id":"test"}' } }],
        model: 'gpt-4o',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    });

    const result = await callLLMWithRetry(testMessages, testConfig);

    expect(result.content).toBe('{"id":"test"}');
    expect(result.model).toBe('gpt-4o');
    expect(result.usage?.totalTokens).toBe(150);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should throw LLMAPIError on non-OK response without retrying', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    await expect(callLLMWithRetry(testMessages, testConfig)).rejects.toThrow(
      LLMAPIError
    );
    // Non-timeout errors should NOT be retried
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on timeout up to maxRetries times', async () => {
    // Use real timers for this test since it involves AbortController
    vi.useRealTimers();

    // Use short timeout config for testing
    const shortTimeoutConfig: LLMConfig = {
      ...testConfig,
      timeoutMs: 50,
      maxRetries: 2,
    };

    // All calls abort (timeout)
    mockFetch.mockImplementation(
      (_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          const onAbort = () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          };
          if (options.signal.aborted) {
            onAbort();
          } else {
            options.signal.addEventListener('abort', onAbort);
          }
        });
      }
    );

    await expect(
      callLLMWithRetry(testMessages, shortTimeoutConfig)
    ).rejects.toThrow(LLMTimeoutError);
    // 1 initial + 2 retries = 3 total attempts
    expect(mockFetch).toHaveBeenCalledTimes(3);

    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('should succeed on retry after timeout', async () => {
    vi.useRealTimers();

    const shortTimeoutConfig: LLMConfig = {
      ...testConfig,
      timeoutMs: 50,
      maxRetries: 2,
    };

    // First call times out via abort signal, second succeeds
    let callCount = 0;
    mockFetch.mockImplementation(
      (_url: string, options: { signal: AbortSignal }) => {
        callCount++;
        if (callCount === 1) {
          return new Promise((_resolve, reject) => {
            const onAbort = () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            };
            if (options.signal.aborted) {
              onAbort();
            } else {
              options.signal.addEventListener('abort', onAbort);
            }
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"id":"retry-success"}' } }],
            model: 'gpt-4o',
          }),
        });
      }
    );

    const result = await callLLMWithRetry(testMessages, shortTimeoutConfig);
    expect(result.content).toBe('{"id":"retry-success"}');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('should use Anthropic endpoint when provider is anthropic', async () => {
    const anthropicConfig: LLMConfig = {
      ...testConfig,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: '{"id":"anthropic-test"}' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 80, output_tokens: 40 },
      }),
    });

    const result = await callLLMWithRetry(testMessages, anthropicConfig);

    expect(result.content).toBe('{"id":"anthropic-test"}');
    expect(result.model).toBe('claude-sonnet-4-20250514');

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toContain('anthropic.com');
  });

  it('should throw LLMAPIError when OpenAI returns empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: null } }] }),
    });

    await expect(callLLMWithRetry(testMessages, testConfig)).rejects.toThrow(
      LLMAPIError
    );
  });
});
