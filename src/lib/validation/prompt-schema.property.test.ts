/**
 * Property-based tests for prompt validation schema.
 *
 * **Validates: Requirements 1.1, 1.7, 1.8**
 *
 * Property 1: For any string with length 10-5000, promptSchema.safeParse succeeds.
 * Property 1 (inverse): For any string with length <10 or >5000, promptSchema.safeParse fails.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { promptSchema, PROMPT_MIN_LENGTH, PROMPT_MAX_LENGTH } from './prompt-schema';

describe('promptSchema property tests', () => {
  it('Property 1: valid prompts (length 10-5000) always pass validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: PROMPT_MIN_LENGTH, maxLength: PROMPT_MAX_LENGTH }),
        (prompt) => {
          const result = promptSchema.safeParse({ prompt });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (inverse): prompts shorter than 10 chars always fail validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: PROMPT_MIN_LENGTH - 1 }),
        (prompt) => {
          const result = promptSchema.safeParse({ prompt });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (inverse): prompts longer than 5000 chars always fail validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: PROMPT_MAX_LENGTH + 1, maxLength: PROMPT_MAX_LENGTH + 500 }),
        (prompt) => {
          const result = promptSchema.safeParse({ prompt });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
