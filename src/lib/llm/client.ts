/**
 * LLM Client abstraction supporting OpenAI, Anthropic, and Amazon Bedrock providers.
 *
 * Features:
 * - 30-second timeout per request
 * - Up to 2 retries on timeout (3 total attempts)
 * - Provider-agnostic interface
 *
 * Validates: Requirements 1.1, 1.2, 1.6
 */

import {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMTimeoutError,
  LLMAPIError,
  getLLMConfig,
} from './types';

/**
 * Makes a single Bedrock API call using AWS SDK.
 */
async function callBedrock(
  config: LLMConfig,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

  const client = new BedrockRuntimeClient({
    region: process.env.BEDROCK_REGION || 'us-east-1',
  });

  // Separate system message from conversation
  const systemMessage = messages.find((m) => m.role === 'system');
  const conversationMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    temperature: 0.3,
    system: systemMessage?.content || '',
    messages: conversationMessages,
  });

  try {
    const command = new InvokeModelCommand({
      modelId: config.model,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const content = responseBody.content?.[0]?.text;
    if (!content) {
      throw new LLMAPIError('Bedrock returned empty response');
    }

    return {
      content,
      model: config.model,
      usage: responseBody.usage
        ? {
            promptTokens: responseBody.usage.input_tokens || 0,
            completionTokens: responseBody.usage.output_tokens || 0,
            totalTokens: (responseBody.usage.input_tokens || 0) + (responseBody.usage.output_tokens || 0),
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof LLMAPIError) throw error;
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new LLMTimeoutError(config.timeoutMs);
    }
    throw new LLMAPIError(
      `Bedrock request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Makes a single LLM API call with timeout enforcement.
 * Does not retry — the caller handles retries.
 */
async function callOpenAI(
  config: LLMConfig,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new LLMAPIError(
        `OpenAI API error (${response.status}): ${errorBody}`,
        response.status
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice?.message?.content) {
      throw new LLMAPIError('OpenAI returned empty response');
    }

    return {
      content: choice.message.content,
      model: data.model || config.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof LLMAPIError) throw error;
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('aborted'))
    ) {
      throw new LLMTimeoutError(config.timeoutMs);
    }
    throw new LLMAPIError(
      `OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Makes a single Anthropic API call with timeout enforcement.
 */
async function callAnthropic(
  config: LLMConfig,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  // Separate system message from conversation messages
  const systemMessage = messages.find((m) => m.role === 'system');
  const conversationMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        temperature: 0.3,
        system: systemMessage?.content || '',
        messages: conversationMessages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new LLMAPIError(
        `Anthropic API error (${response.status}): ${errorBody}`,
        response.status
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new LLMAPIError('Anthropic returned empty response');
    }

    return {
      content,
      model: data.model || config.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens:
              (data.usage.input_tokens || 0) +
              (data.usage.output_tokens || 0),
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof LLMAPIError) throw error;
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('aborted'))
    ) {
      throw new LLMTimeoutError(config.timeoutMs);
    }
    throw new LLMAPIError(
      `Anthropic request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sends messages to the configured LLM provider (single attempt, no retry).
 */
async function sendToLLM(
  config: LLMConfig,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  if (config.provider === 'bedrock') {
    return callBedrock(config, messages);
  }
  if (config.provider === 'anthropic') {
    return callAnthropic(config, messages);
  }
  return callOpenAI(config, messages);
}

/**
 * Calls the LLM with retry logic on timeout.
 *
 * - 30-second timeout per request
 * - Up to 2 retries on timeout (3 total attempts)
 * - Non-timeout errors are NOT retried (they are non-transient)
 */
export async function callLLMWithRetry(
  messages: LLMMessage[],
  config?: LLMConfig
): Promise<LLMResponse> {
  const llmConfig = config || getLLMConfig();
  const maxAttempts = llmConfig.maxRetries + 1; // retries + initial attempt

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await sendToLLM(llmConfig, messages);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on timeout errors
      if (!(error instanceof LLMTimeoutError)) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxAttempts) {
        throw error;
      }

      // Brief pause before retry (exponential backoff: 1s, 2s)
      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 1000)
      );
    }
  }

  // This should never be reached, but satisfies TypeScript
  throw lastError || new LLMAPIError('All LLM attempts failed');
}
