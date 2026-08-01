/**
 * API Client
 *
 * Routes requests to either the local Next.js API routes (development)
 * or the deployed API Gateway endpoint (production).
 *
 * In production, set NEXT_PUBLIC_API_GATEWAY_URL to the API Gateway endpoint
 * (e.g. https://abc123.execute-api.us-east-1.amazonaws.com).
 *
 * The client automatically attaches the Cognito JWT token from localStorage
 * when calling the API Gateway.
 */

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';

/**
 * Returns the base URL for API calls.
 * - In development (no API_GATEWAY_URL set): uses Next.js API routes (relative path)
 * - In production (API_GATEWAY_URL set): uses the API Gateway endpoint
 */
function getBaseUrl(): string {
  return API_GATEWAY_URL || '';
}

/**
 * Retrieves the current Cognito access token from localStorage/session.
 * Returns null if not authenticated.
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Try Amplify's token storage pattern
  try {
    // Amplify v6 stores tokens under CognitoIdentityServiceProvider keys
    const keys = Object.keys(localStorage);
    const accessTokenKey = keys.find(
      (k) => k.includes('CognitoIdentityServiceProvider') && k.endsWith('.accessToken')
    );
    if (accessTokenKey) {
      return localStorage.getItem(accessTokenKey);
    }

    // Fallback: check for manually stored token
    const storedToken = localStorage.getItem('auth_access_token');
    if (storedToken) return storedToken;
  } catch {
    // localStorage not available
  }

  return null;
}

/**
 * Makes an authenticated API request.
 * Attaches the Authorization header when calling API Gateway.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach auth token when calling API Gateway
  if (baseUrl) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(response.status, errorBody.error || response.statusText, errorBody);
  }

  return response.json();
}

/**
 * API error with status code and response body.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================
// Typed API Methods
// ============================================================

export interface GenerateDiagramRequest {
  prompt: string;
  templateId?: string;
  preferences?: {
    region?: string;
    layoutOrientation?: 'horizontal' | 'vertical';
    includeAnalysis?: boolean;
    includeCostEstimate?: boolean;
  };
}

export interface GenerateDiagramResponse {
  diagramId: string;
  architectureSpec: unknown;
  status: string;
  serviceCount: number;
  model: string;
  region: string;
  explanation?: unknown;
}

/**
 * Generates an architecture diagram from a natural language prompt.
 * POST /api/diagrams/generate
 */
export async function generateDiagram(
  request: GenerateDiagramRequest
): Promise<GenerateDiagramResponse> {
  return apiRequest<GenerateDiagramResponse>('/api/diagrams/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export interface ExportDiagramRequest {
  format: 'drawio' | 'png' | 'svg' | 'pdf' | 'json' | 'markdown';
  options?: {
    dpi?: number;
    pageSize?: 'A4' | 'Letter' | 'A3';
  };
}

export interface ExportDiagramResponse {
  downloadUrl: string;
  format: string;
  filename: string;
}

/**
 * Exports a diagram in the specified format.
 * POST /api/diagrams/:id/export
 */
export async function exportDiagram(
  diagramId: string,
  request: ExportDiagramRequest
): Promise<ExportDiagramResponse> {
  return apiRequest<ExportDiagramResponse>(`/api/diagrams/${diagramId}/export`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Gets architecture analysis for a diagram.
 * GET /api/diagrams/:id/analysis
 */
export async function getAnalysis(diagramId: string): Promise<unknown> {
  return apiRequest(`/api/diagrams/${diagramId}/analysis`);
}

/**
 * Gets cost estimate for a diagram.
 * GET /api/diagrams/:id/cost
 */
export async function getCostEstimate(diagramId: string): Promise<unknown> {
  return apiRequest(`/api/diagrams/${diagramId}/cost`);
}

export interface IaCRequest {
  format: 'terraform' | 'cdk' | 'cloudformation';
}

/**
 * Generates Infrastructure as Code for a diagram.
 * POST /api/diagrams/:id/iac
 */
export async function generateIaC(diagramId: string, request: IaCRequest): Promise<unknown> {
  return apiRequest(`/api/diagrams/${diagramId}/iac`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Imports a .drawio file.
 * POST /api/diagrams/import
 */
export async function importDiagram(file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', file);

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/diagrams/import`;

  const headers: Record<string, string> = {};
  if (baseUrl) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(response.status, errorBody.error || response.statusText, errorBody);
  }

  return response.json();
}
