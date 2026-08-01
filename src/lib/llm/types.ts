/**
 * LLM client configuration and types.
 *
 * Supports both OpenAI and Anthropic providers via environment variables.
 */

/**
 * Supported LLM providers.
 */
export type LLMProvider = 'openai' | 'anthropic' | 'bedrock';

/**
 * Configuration for the LLM client.
 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

/**
 * A message in the LLM conversation format.
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Response from the LLM client.
 */
export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Error thrown when the LLM request times out.
 */
export class LLMTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`LLM request timed out after ${timeoutMs}ms`);
    this.name = 'LLMTimeoutError';
  }
}

/**
 * Error thrown when the LLM response cannot be parsed.
 */
export class LLMParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string
  ) {
    super(message);
    this.name = 'LLMParseError';
  }
}

/**
 * Error thrown when the LLM API returns an error.
 */
export class LLMAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'LLMAPIError';
  }
}

/** Default timeout of 30 seconds per request. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Maximum retry attempts on timeout (2 retries = 3 total attempts). */
export const DEFAULT_MAX_RETRIES = 2;

/**
 * Returns the LLM configuration from environment variables.
 */
export function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'bedrock') as LLMProvider;

  let apiKey: string;
  let model: string;

  if (provider === 'bedrock') {
    apiKey = ''; // Bedrock uses IAM credentials, no API key needed
    model = process.env.LLM_MODEL || 'anthropic.claude-sonnet-4-20250514-v1:0';
  } else if (provider === 'anthropic') {
    apiKey = process.env.ANTHROPIC_API_KEY || '';
    model = process.env.LLM_MODEL || 'claude-sonnet-4-20250514';
  } else {
    apiKey = process.env.OPENAI_API_KEY || '';
    model = process.env.LLM_MODEL || 'gpt-4o';
  }

  return {
    provider,
    apiKey,
    model,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxRetries: DEFAULT_MAX_RETRIES,
  };
}
