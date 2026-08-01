/**
 * LLM module public API.
 *
 * Re-exports all public types, functions, and constants from the LLM subsystem.
 */

export { callLLMWithRetry } from './client';
export { buildGenerationMessages, ARCHITECTURE_SYSTEM_PROMPT } from './prompts';
export {
  validateArchitectureSpec,
  parseAndValidateArchitectureSpec,
  architectureSpecSchema,
} from './schema-validator';
export type {
  ArchitectureValidationResult,
  ValidationResult,
  ValidationFailure,
} from './schema-validator';
export {
  getLLMConfig,
  LLMTimeoutError,
  LLMParseError,
  LLMAPIError,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
} from './types';
export type {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMProvider,
} from './types';
