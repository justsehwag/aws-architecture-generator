export interface DrawioGenerateRequest {
  prompt: string;
}

export interface DrawioGenerateResponse {
  drawioXml: string;
  diagramId: string;
}

export interface DrawioGenerateError {
  error: string;
  code?: string;
  requestId?: string;
}

/**
 * Type guard to check if an unknown error is a DrawioGenerateError.
 */
export function isDrawioGenerateError(
  error: unknown
): error is DrawioGenerateError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as DrawioGenerateError).error === 'string'
  );
}

/**
 * Calls the Lambda Function URL to generate Draw.io XML from a prompt.
 *
 * @throws DrawioGenerateError if the service is not configured, request fails, or returns an error response
 */
export async function generateDrawioXml(
  request: DrawioGenerateRequest
): Promise<DrawioGenerateResponse> {
  const url = process.env.NEXT_PUBLIC_DRAWIO_GENERATOR_URL;

  if (!url) {
    throw {
      error: 'Diagram generation service is not configured',
      code: 'SERVICE_NOT_CONFIGURED',
    } as DrawioGenerateError;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 900_000); // 900 seconds (15 minutes)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: request.prompt }),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        drawioXml: data.drawioXml,
        diagramId: data.diagramId,
      };
    }

    // HTTP error response — parse the error body
    let errorBody: Partial<DrawioGenerateError>;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    throw {
      error: errorBody.error || `Request failed with status ${response.status}`,
      code: errorBody.code,
      requestId: errorBody.requestId,
    } as DrawioGenerateError;
  } catch (err: unknown) {
    // Re-throw if it's already a DrawioGenerateError
    if (isDrawioGenerateError(err)) {
      throw err;
    }

    // Network or timeout error
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw {
        error: 'Request timed out. The diagram generation took too long.',
        code: 'TIMEOUT',
      } as DrawioGenerateError;
    }

    throw {
      error:
        err instanceof Error
          ? `Network error: ${err.message}`
          : 'An unexpected network error occurred',
      code: 'NETWORK_ERROR',
    } as DrawioGenerateError;
  } finally {
    clearTimeout(timeoutId);
  }
}
