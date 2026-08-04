/**
 * Draw.io Generator Lambda Handler
 *
 * Processes natural language architecture prompts via Amazon Bedrock (Claude Sonnet)
 * and produces Draw.io mxGraphModel XML directly. Uses a Lambda Function URL
 * (no API Gateway) supporting up to 15-minute execution.
 *
 * Environment Variables:
 * - BEDROCK_MODEL_ID: Bedrock model ID (default: us.anthropic.claude-sonnet-4-5-20250929-v1:0)
 * - BEDROCK_REGION: AWS region for Bedrock (default: us-east-1)
 *
 * Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { buildSystemPrompt } from './system-prompt';

// ============================================================
// Types
// ============================================================

export interface LambdaFunctionURLEvent {
  requestContext: {
    http: {
      method: string;
      path: string;
      sourceIp: string;
    };
    requestId: string;
  };
  headers: Record<string, string>;
  body?: string;
  isBase64Encoded: boolean;
}

export interface LambdaFunctionURLResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// ============================================================
// Constants
// ============================================================

const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';
const MAX_RETRIES = 2; // 3 total attempts (1 initial + 2 retries)
const REQUEST_TIMEOUT_MS = 300_000; // 5 minutes per attempt — generous for large XML contexts

const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 50000; // Increased to support chat context with existing XML

// ============================================================
// Bedrock Client (initialized outside handler for warm starts)
// ============================================================

const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });

// ============================================================
// Helpers
// ============================================================

/**
 * Returns standard response headers.
 * Note: CORS headers are handled automatically by the Lambda Function URL
 * infrastructure configuration. Do NOT add them here or you get duplicate headers.
 */
function responseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Builds a structured error response with CORS headers.
 * All error responses include `error`, `code`, and `requestId` fields.
 */
function errorResponse(
  statusCode: number,
  error: string,
  code: string,
  requestId: string
): LambdaFunctionURLResponse {
  return {
    statusCode,
    headers: responseHeaders(),
    body: JSON.stringify({ error, code, requestId }),
  };
}

// ============================================================
// Bedrock Invocation with Retry Logic
// ============================================================

/**
 * Determines if a Bedrock error is retryable (throttling, service unavailable, timeout).
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name;
    return (
      name === 'ThrottlingException' ||
      name === 'ServiceUnavailableException' ||
      name === 'ModelTimeoutException' ||
      name === 'TimeoutError' ||
      error.message?.includes('timeout')
    );
  }
  return false;
}

/**
 * Determines if a Bedrock error is a non-retryable access/model error.
 */
function isAccessDeniedError(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name;
    return (
      name === 'AccessDeniedException' ||
      name === 'ModelNotReadyException' ||
      name === 'ResourceNotFoundException'
    );
  }
  return false;
}

/**
 * Waits for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Invokes Bedrock with the given messages array, with retry logic.
 * - Max 3 total attempts (1 initial + 2 retries)
 * - Exponential backoff: 1s, 2s between retryable failures
 * - Immediate throw on AccessDeniedException or model not found
 * - 60-second timeout per attempt via Promise.race
 * - If modelId is provided, uses it instead of the default BEDROCK_MODEL_ID
 *
 * Validates: Requirements 2.1, 2.4, 2.5, 2.6, 2.7, 5.2, 5.4
 */
export async function callBedrockWithRetry(
  messages: Array<{ role: string; content: string }>,
  modelId?: string
): Promise<string> {
  const resolvedModelId = modelId || BEDROCK_MODEL_ID;

  const requestBody = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 32768,
    temperature: 0.2,
    system: buildSystemPrompt(),
    messages,
  });

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId: resolvedModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: requestBody,
      });

      // Race between the Bedrock call and a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const err = new Error(`Bedrock request timed out after ${REQUEST_TIMEOUT_MS}ms`);
          err.name = 'TimeoutError';
          reject(err);
        }, REQUEST_TIMEOUT_MS);
      });

      const response = await Promise.race([
        bedrockClient.send(command),
        timeoutPromise,
      ]);

      // Extract text content from Bedrock response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const textContent = responseBody.content?.[0]?.text;

      if (!textContent) {
        throw new Error('Empty response from Bedrock model');
      }

      return textContent;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Non-retryable errors: throw immediately
      if (isAccessDeniedError(error)) {
        throw error;
      }

      lastError = error;

      // If retryable and we have attempts remaining, wait and retry
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        const backoffMs = (attempt + 1) * 1000; // 1s, 2s
        console.warn(`Bedrock attempt ${attempt + 1} failed (${error.name}), retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }

      // Non-retryable error that isn't access denied, or retries exhausted
      break;
    }
  }

  // All retries exhausted or non-retryable error
  throw lastError || new Error('Bedrock invocation failed');
}

// ============================================================
// XML Extraction and Validation
// ============================================================

/**
 * Extracts Draw.io XML from an LLM response that may contain markdown fences
 * or surrounding text. Returns the `<mxGraphModel>...</mxGraphModel>` XML
 * inclusive of the tags, or null if not found.
 *
 * Validates: Requirements 2.3
 */
export function extractDrawioXml(llmResponse: string): string | null {
  if (!llmResponse) {
    return null;
  }

  // Strip markdown code fences if present (```xml ... ``` or ``` ... ```)
  let cleaned = llmResponse;
  const codeFenceRegex = /```(?:xml)?\s*\n?([\s\S]*?)```/g;
  const fenceMatch = codeFenceRegex.exec(cleaned);
  if (fenceMatch) {
    cleaned = fenceMatch[1];
  }

  // Find the first occurrence of <mxGraphModel
  const startIdx = cleaned.indexOf('<mxGraphModel');
  if (startIdx === -1) {
    return null;
  }

  // Find the last occurrence of </mxGraphModel>
  const endTag = '</mxGraphModel>';
  const endIdx = cleaned.lastIndexOf(endTag);
  if (endIdx === -1) {
    return null;
  }

  // Extract everything from <mxGraphModel to end of </mxGraphModel>
  const extracted = cleaned.substring(startIdx, endIdx + endTag.length);

  return extracted;
}

/**
 * Performs basic structural validation on Draw.io XML.
 * Checks for required elements without full XML parsing (no DOM parser in Lambda).
 *
 * Validates: Requirements 2.8, 3.9, 5.3
 */
export function validateDrawioXml(xml: string): boolean {
  if (!xml) {
    return false;
  }

  const trimmed = xml.trim();

  // Must start with <mxGraphModel
  if (!trimmed.startsWith('<mxGraphModel')) {
    return false;
  }

  // Must end with </mxGraphModel>
  if (!trimmed.endsWith('</mxGraphModel>')) {
    return false;
  }

  // Must contain at least one <mxCell element
  if (!trimmed.includes('<mxCell')) {
    return false;
  }

  // Must contain root cells (id="0" and id="1")
  if (!trimmed.includes('id="0"') && !trimmed.includes("id='0'")) {
    return false;
  }

  if (!trimmed.includes('id="1"') && !trimmed.includes("id='1'")) {
    return false;
  }

  return true;
}

// ============================================================
// Chat Mode
// ============================================================

const CHAT_SYSTEM_PROMPT = `You are an AWS Solutions Architect assistant. You can see the user's current architecture diagram XML. Answer questions about it, explain the architecture, suggest improvements, describe data flow, etc. Be concise and helpful.`;

/**
 * Handles chat mode requests — conversational Q&A about the architecture.
 * Skips XML generation/validation and returns raw text response.
 */
async function handleChatMode(
  prompt: string,
  requestId: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  currentXml?: string,
  modelId?: string
): Promise<LambdaFunctionURLResponse> {
  try {
    const messages: Array<{ role: string; content: string }> = [];

    // If currentXml is provided, include it as context
    if (currentXml) {
      messages.push({
        role: 'user',
        content: `Here is the current Draw.io XML diagram for context:\n\n${currentXml}\n\nI have a question about this architecture.`,
      });
      messages.push({
        role: 'assistant',
        content: 'I can see your architecture diagram. What would you like to know?',
      });
    }

    // Append conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add the user's current prompt as the final message
    messages.push({ role: 'user', content: prompt });

    // Truncate oldest history messages if total context exceeds limit
    const totalChars = () => messages.reduce((sum, m) => sum + m.content.length, 0);
    while (totalChars() > MAX_CONTEXT_CHARS && messages.length > 1) {
      messages.shift();
    }

    // Call Bedrock with the chat system prompt instead of the XML generation prompt
    const resolvedModelId = modelId || BEDROCK_MODEL_ID;
    const requestBody = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      temperature: 0.3,
      system: CHAT_SYSTEM_PROMPT,
      messages,
    });

    let lastError: Error | undefined;
    let textResponse = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const command = new InvokeModelCommand({
          modelId: resolvedModelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: requestBody,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const err = new Error(`Bedrock request timed out after ${REQUEST_TIMEOUT_MS}ms`);
            err.name = 'TimeoutError';
            reject(err);
          }, REQUEST_TIMEOUT_MS);
        });

        const response = await Promise.race([
          bedrockClient.send(command),
          timeoutPromise,
        ]);

        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        textResponse = responseBody.content?.[0]?.text || '';

        if (!textResponse) {
          throw new Error('Empty response from Bedrock model');
        }

        break; // Success
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (isAccessDeniedError(error)) throw error;
        lastError = error;
        if (isRetryableError(error) && attempt < MAX_RETRIES) {
          await sleep((attempt + 1) * 1000);
          continue;
        }
        break;
      }
    }

    if (!textResponse) {
      const error = lastError || new Error('Bedrock invocation failed');
      if (isAccessDeniedError(error)) {
        return errorResponse(503, 'Bedrock model is not enabled or access is denied.', 'MODEL_ACCESS_DENIED', requestId);
      }
      if (isRetryableError(error)) {
        return errorResponse(502, `Chat request failed after multiple attempts: ${error.message}`, 'LLM_ERROR', requestId);
      }
      return errorResponse(502, `Chat request failed: ${error.message}`, 'LLM_ERROR', requestId);
    }

    return {
      statusCode: 200,
      headers: responseHeaders(),
      body: JSON.stringify({ response: textResponse, mode: 'chat' }),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (isAccessDeniedError(error)) {
      return errorResponse(503, 'Bedrock model is not enabled or access is denied.', 'MODEL_ACCESS_DENIED', requestId);
    }
    return errorResponse(502, `Chat request failed: ${error.message}`, 'LLM_ERROR', requestId);
  }
}

// ============================================================
// Diagram Generation
// ============================================================

/**
 * Maximum total character length for conversation context sent to Bedrock.
 * If conversationHistory + currentXml + prompt exceeds this, oldest history messages are truncated.
 */
const MAX_CONTEXT_CHARS = 180_000;

/**
 * Generates a Draw.io XML diagram from the given prompt using Bedrock.
 * Assembles the full messages array server-side from currentXml, conversationHistory, and prompt.
 * Calls Bedrock with retry logic, extracts and validates the XML response.
 *
 * Validates: Requirements 2.1, 2.3, 2.8, 2.9, 3.9, 4.5, 5.1, 5.2, 5.3, 5.5
 */
async function generateDiagram(
  prompt: string,
  requestId: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  currentXml?: string,
  modelId?: string
): Promise<LambdaFunctionURLResponse> {
  try {
    // Assemble messages array for Bedrock
    const messages: Array<{ role: string; content: string }> = [];

    // If currentXml is provided, add it as the first user message with context framing
    if (currentXml) {
      messages.push({
        role: 'user',
        content: `Here is the current Draw.io XML diagram:\n\n${currentXml}\n\nPlease modify it based on the following instruction.`,
      });
      // Add a placeholder assistant acknowledgment to maintain alternating roles
      messages.push({
        role: 'assistant',
        content: 'I understand. I have the current diagram XML. Please provide your instruction.',
      });
    }

    // Append conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add the user's current prompt as the final message
    messages.push({ role: 'user', content: prompt });

    // Truncate oldest history messages if total context exceeds limit
    const totalChars = () => messages.reduce((sum, m) => sum + m.content.length, 0);
    while (totalChars() > MAX_CONTEXT_CHARS && messages.length > 1) {
      // Remove the oldest message (but never remove the last user prompt)
      messages.shift();
    }

    const llmResponse = await callBedrockWithRetry(messages, modelId);

    // Extract XML from the LLM response
    const extractedXml = extractDrawioXml(llmResponse);
    if (!extractedXml) {
      console.error('XML extraction failed:', {
        responseLength: llmResponse.length,
        requestId,
      });
      return errorResponse(
        422,
        'AI did not produce valid diagram XML. The response did not contain a valid mxGraphModel element.',
        'INVALID_XML',
        requestId
      );
    }

    // Validate the extracted XML structure
    if (!validateDrawioXml(extractedXml)) {
      console.error('XML validation failed:', {
        xmlLength: extractedXml.length,
        requestId,
      });
      return errorResponse(
        422,
        'AI did not produce valid diagram XML. The generated XML is malformed or missing required elements.',
        'INVALID_XML',
        requestId
      );
    }

    // Generate a unique diagram ID
    const diagramId = `drawio-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    return {
      statusCode: 200,
      headers: responseHeaders(),
      body: JSON.stringify({ drawioXml: extractedXml, diagramId }),
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));

    // AccessDeniedException → HTTP 503, MODEL_ACCESS_DENIED
    if (isAccessDeniedError(error)) {
      console.error('Bedrock access denied:', {
        message: error.message,
        name: error.name,
        requestId,
      });
      return errorResponse(
        503,
        'Bedrock model is not enabled or access is denied. Please enable the model in the AWS console.',
        'MODEL_ACCESS_DENIED',
        requestId
      );
    }

    // Retries exhausted or other retryable errors → HTTP 502, LLM_ERROR
    if (isRetryableError(error)) {
      console.error('Bedrock retries exhausted:', {
        message: error.message,
        name: error.name,
        requestId,
      });
      return errorResponse(
        502,
        `Diagram generation failed after multiple attempts: ${error.message}`,
        'LLM_ERROR',
        requestId
      );
    }

    // Other Bedrock errors → HTTP 502, LLM_ERROR
    console.error('Bedrock invocation error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      requestId,
    });
    return errorResponse(
      502,
      `Diagram generation failed: ${error.message}`,
      'LLM_ERROR',
      requestId
    );
  }
}

// ============================================================
// Lambda Handler
// ============================================================

export const handler = async (
  event: LambdaFunctionURLEvent
): Promise<LambdaFunctionURLResponse> => {
  const requestId = event.requestContext?.requestId || 'unknown';
  const method = event.requestContext?.http?.method?.toUpperCase() || '';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: responseHeaders(),
      body: '',
    };
  }

  // Reject unsupported HTTP methods
  if (method !== 'POST') {
    return errorResponse(
      405,
      `Method ${method} not allowed. Use POST to generate diagrams.`,
      'METHOD_NOT_ALLOWED',
      requestId
    );
  }

  // Parse JSON body
  if (!event.body) {
    return errorResponse(
      400,
      'Request body is required',
      'INVALID_REQUEST',
      requestId
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body);
  } catch {
    return errorResponse(
      400,
      'Invalid JSON in request body',
      'INVALID_REQUEST',
      requestId
    );
  }

  // Validate prompt field
  const { prompt, conversationHistory, currentXml, modelId, mode } = body as {
    prompt: unknown;
    conversationHistory?: Array<{ role: string; content: string }>;
    currentXml?: string;
    modelId?: string;
    mode?: string;
  };

  if (!prompt || typeof prompt !== 'string') {
    return errorResponse(
      400,
      'Prompt is required and must be a string with at least 10 characters',
      'INVALID_PROMPT',
      requestId
    );
  }

  if (prompt.length < MIN_PROMPT_LENGTH) {
    return errorResponse(
      400,
      `Prompt must be at least ${MIN_PROMPT_LENGTH} characters`,
      'INVALID_PROMPT',
      requestId
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return errorResponse(
      400,
      `Prompt must not exceed ${MAX_PROMPT_LENGTH} characters`,
      'INVALID_PROMPT',
      requestId
    );
  }

  // Route based on mode
  try {
    if (mode === 'chat') {
      return await handleChatMode(
        prompt,
        requestId,
        conversationHistory,
        currentXml as string | undefined,
        modelId as string | undefined
      );
    }

    // Default: XML generation mode
    return await generateDiagram(
      prompt,
      requestId,
      conversationHistory,
      currentXml as string | undefined,
      modelId as string | undefined
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Unexpected error:', {
      message: error.message,
      stack: error.stack,
      requestId,
      promptLength: prompt.length,
      sourceIp: event.requestContext?.http?.sourceIp,
    });

    return errorResponse(
      500,
      'Internal server error',
      'INTERNAL_ERROR',
      requestId
    );
  }
};
