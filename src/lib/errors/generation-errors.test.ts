import { describe, it, expect } from 'vitest';
import {
  getHttpErrorMessage,
  generateAlternativePrompts,
  createApiError,
  createParseError,
  createTimeoutError,
  createNetworkError,
} from './generation-errors';

describe('generation-errors', () => {
  describe('getHttpErrorMessage', () => {
    it('returns specific message for known 4xx codes', () => {
      expect(getHttpErrorMessage(400)).toContain('invalid');
      expect(getHttpErrorMessage(401)).toContain('session');
      expect(getHttpErrorMessage(403)).toContain('permission');
      expect(getHttpErrorMessage(429)).toContain('Too many');
    });

    it('returns specific message for known 5xx codes', () => {
      expect(getHttpErrorMessage(500)).toContain('our end');
      expect(getHttpErrorMessage(502)).toContain('unavailable');
      expect(getHttpErrorMessage(503)).toContain('maintenance');
    });

    it('returns generic 4xx message for unknown client errors', () => {
      const msg = getHttpErrorMessage(418);
      expect(msg).toContain('problem with your request');
    });

    it('returns generic 5xx message for unknown server errors', () => {
      const msg = getHttpErrorMessage(599);
      expect(msg).toContain('our end');
    });

    it('returns generic message for non-error status codes', () => {
      const msg = getHttpErrorMessage(200);
      expect(msg).toContain('unexpected error');
    });
  });

  describe('generateAlternativePrompts', () => {
    it('returns 3 suggestions for an empty prompt', () => {
      const suggestions = generateAlternativePrompts('');
      expect(suggestions).toHaveLength(3);
      suggestions.forEach((s) => expect(s.length).toBeGreaterThan(0));
    });

    it('returns 3 suggestions for a non-empty prompt', () => {
      const suggestions = generateAlternativePrompts(
        'build me a web app'
      );
      expect(suggestions).toHaveLength(3);
    });

    it('suggestions are strings, not empty', () => {
      const suggestions = generateAlternativePrompts('my architecture');
      suggestions.forEach((s) => {
        expect(typeof s).toBe('string');
        expect(s.length).toBeGreaterThan(0);
      });
    });
  });

  describe('createApiError', () => {
    it('creates retryable error for 5xx', () => {
      const error = createApiError(500);
      expect(error.type).toBe('api');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(500);
    });

    it('creates retryable error for 429', () => {
      const error = createApiError(429);
      expect(error.retryable).toBe(true);
    });

    it('creates non-retryable error for 400', () => {
      const error = createApiError(400);
      expect(error.retryable).toBe(false);
    });

    it('creates non-retryable error for 403', () => {
      const error = createApiError(403);
      expect(error.retryable).toBe(false);
    });
  });

  describe('createParseError', () => {
    it('includes suggestions based on original prompt', () => {
      const error = createParseError('my architecture');
      expect(error.type).toBe('parse');
      expect(error.retryable).toBe(false);
      expect(error.suggestions).toHaveLength(3);
    });

    it('has a user-friendly message', () => {
      const error = createParseError('test');
      expect(error.message).toContain("couldn't interpret");
    });
  });

  describe('createTimeoutError', () => {
    it('creates a retryable timeout error', () => {
      const error = createTimeoutError();
      expect(error.type).toBe('timeout');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('longer than expected');
    });
  });

  describe('createNetworkError', () => {
    it('creates a retryable network error', () => {
      const error = createNetworkError();
      expect(error.type).toBe('network');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('Network connection lost');
    });
  });
});
