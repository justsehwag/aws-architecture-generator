/**
 * Generation error types, messages, and helpers.
 * Validates: Requirements 1.4, 1.5, 1.6, 13.1
 */

export type GenerationErrorType = 'parse' | 'timeout' | 'api' | 'network';

export interface GenerationError {
  type: GenerationErrorType;
  message: string;
  statusCode?: number;
  suggestions?: string[];
  retryable: boolean;
}

/**
 * User-friendly messages for HTTP status codes.
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  408: 'The request timed out. Please try again.',
  413: 'Your prompt is too large to process. Try shortening it.',
  422: 'The server could not process your architecture description. Try rephrasing it.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again shortly.',
  502: 'The service is temporarily unavailable. Please try again in a moment.',
  503: 'The service is currently under maintenance. Please try again later.',
  504: 'The request took too long to process. Please try again.',
};

/**
 * Returns a user-friendly message for a given HTTP status code.
 */
export function getHttpErrorMessage(statusCode: number): string {
  if (HTTP_STATUS_MESSAGES[statusCode]) {
    return HTTP_STATUS_MESSAGES[statusCode];
  }

  if (statusCode >= 400 && statusCode < 500) {
    return 'There was a problem with your request. Please check your input and try again.';
  }

  if (statusCode >= 500) {
    return 'Something went wrong on our end. Please try again shortly.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Generates up to 3 alternative prompt suggestions based on the original prompt.
 * Used when the LLM cannot interpret the user's architecture description.
 */
export function generateAlternativePrompts(originalPrompt: string): string[] {
  const trimmed = originalPrompt.trim();

  if (!trimmed) {
    return [
      'A three-tier web application with an ALB, EC2 instances, and RDS database',
      'A serverless API using API Gateway, Lambda, and DynamoDB',
      'A static website hosted on S3 with CloudFront CDN',
    ];
  }

  const suggestions: string[] = [];

  // Suggestion 1: Add more specificity about AWS services
  suggestions.push(
    `Describe specific AWS services: "${trimmed}" — try naming the services explicitly (e.g., EC2, Lambda, S3, RDS)`
  );

  // Suggestion 2: Restructure as a use-case description
  suggestions.push(
    `Describe as a use case: "I need an AWS architecture that handles [your use case] using [specific services]"`
  );

  // Suggestion 3: Start from a known pattern
  suggestions.push(
    `Start from a pattern: "A [three-tier/serverless/microservices] architecture for [your application purpose]"`
  );

  return suggestions;
}

/**
 * Creates a GenerationError from an HTTP status code.
 */
export function createApiError(statusCode: number): GenerationError {
  return {
    type: 'api',
    message: getHttpErrorMessage(statusCode),
    statusCode,
    retryable: statusCode >= 500 || statusCode === 408 || statusCode === 429,
  };
}

/**
 * Creates a parse error with alternative prompt suggestions.
 */
export function createParseError(originalPrompt: string): GenerationError {
  return {
    type: 'parse',
    message:
      "We couldn't interpret your architecture description. Try rephrasing with more specific AWS service names.",
    suggestions: generateAlternativePrompts(originalPrompt),
    retryable: false,
  };
}

/**
 * Creates a timeout error.
 */
export function createTimeoutError(): GenerationError {
  return {
    type: 'timeout',
    message:
      'Generation is taking longer than expected. The service may be experiencing high demand.',
    retryable: true,
  };
}

/**
 * Creates a network error.
 */
export function createNetworkError(): GenerationError {
  return {
    type: 'network',
    message: 'Network connection lost. Your changes have been saved locally.',
    retryable: true,
  };
}
