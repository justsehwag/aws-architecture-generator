import { describe, it, expect } from 'vitest';
import {
  promptSchema,
  PROMPT_MIN_LENGTH,
  PROMPT_MAX_LENGTH,
} from './prompt-schema';

describe('promptSchema', () => {
  it('accepts a valid prompt within range', () => {
    const result = promptSchema.safeParse({ prompt: 'A web app with EC2 and S3' });
    expect(result.success).toBe(true);
  });

  it('rejects a prompt shorter than minimum length', () => {
    const result = promptSchema.safeParse({ prompt: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        `${PROMPT_MIN_LENGTH}`
      );
    }
  });

  it('rejects an empty prompt', () => {
    const result = promptSchema.safeParse({ prompt: '' });
    expect(result.success).toBe(false);
  });

  it('accepts a prompt at exactly minimum length', () => {
    const prompt = 'a'.repeat(PROMPT_MIN_LENGTH);
    const result = promptSchema.safeParse({ prompt });
    expect(result.success).toBe(true);
  });

  it('accepts a prompt at exactly maximum length', () => {
    const prompt = 'a'.repeat(PROMPT_MAX_LENGTH);
    const result = promptSchema.safeParse({ prompt });
    expect(result.success).toBe(true);
  });

  it('rejects a prompt exceeding maximum length', () => {
    const prompt = 'a'.repeat(PROMPT_MAX_LENGTH + 1);
    const result = promptSchema.safeParse({ prompt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        `${PROMPT_MAX_LENGTH}`
      );
    }
  });

  it('exports correct length constants', () => {
    expect(PROMPT_MIN_LENGTH).toBe(10);
    expect(PROMPT_MAX_LENGTH).toBe(5000);
  });
});
