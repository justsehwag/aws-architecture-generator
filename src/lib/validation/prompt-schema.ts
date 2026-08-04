import { z } from 'zod';

export const PROMPT_MIN_LENGTH = 10;
export const PROMPT_MAX_LENGTH = 10000;

/**
 * Zod schema for validating architecture prompt input.
 * Enforces minimum 10 characters and maximum 5000 characters.
 * Validates: Requirements 1.1, 1.7, 1.8
 */
export const promptSchema = z.object({
  prompt: z
    .string()
    .min(PROMPT_MIN_LENGTH, {
      message: `Prompt must be at least ${PROMPT_MIN_LENGTH} characters`,
    })
    .max(PROMPT_MAX_LENGTH, {
      message: `Prompt must not exceed ${PROMPT_MAX_LENGTH} characters`,
    }),
});

export type PromptFormValues = z.infer<typeof promptSchema>;
