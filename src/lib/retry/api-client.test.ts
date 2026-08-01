import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiClient, ApiError, NetworkError } from './api-client';

describe('api-client', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns JSON response on successful GET', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: 'test' }),
    });

    const client = createApiClient();
    const result = await client.get('/api/test');

    expect(result).toEqual({ data: 'test' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx errors with exponential backoff', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: 'server error' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers(),
        json: async () => ({ error: 'unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'recovered' }),
      });

    const client = createApiClient();
    const promise = client.get('/api/test');

    // First retry after 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Second retry after 2000ms
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toEqual({ data: 'recovered' });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 4xx errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({ error: 'bad request' }),
    });

    const client = createApiClient();

    await expect(client.get('/api/test')).rejects.toBeInstanceOf(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError with correct status code on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => ({ message: 'not found' }),
    });

    const client = createApiClient();

    try {
      await client.get('/api/missing');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(404);
    }
  });

  it('retries on network failures (TypeError from fetch)', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'recovered' }),
      });

    const client = createApiClient();
    const promise = client.get('/api/test');

    // Network error retry after 1000ms
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toEqual({ data: 'recovered' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('sends POST with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: '123' }),
    });

    const client = createApiClient({ baseUrl: 'http://localhost:3000' });
    const result = await client.post('/api/diagrams', { prompt: 'test' });

    expect(result).toEqual({ id: '123' });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/diagrams');
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ prompt: 'test' }));
  });

  it('preserves request body on retry', async () => {
    const body = { prompt: 'complex architecture' };

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: new Headers(),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: '456' }),
      });

    const client = createApiClient();
    const promise = client.post('/api/test', body);

    await vi.advanceTimersByTimeAsync(1000);

    await promise;

    // Verify body was preserved for both calls
    expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify(body));
    expect(mockFetch.mock.calls[1][1].body).toBe(JSON.stringify(body));
  });

  it('throws after all retry attempts are exhausted', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: 'server error' }),
      })
    );

    const client = createApiClient();
    const promise = client.get('/api/test');

    await vi.advanceTimersByTimeAsync(1100);
    await vi.advanceTimersByTimeAsync(2100);

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
