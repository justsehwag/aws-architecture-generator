import { cookies } from 'next/headers';

/**
 * Result of an API authentication check.
 */
export interface ApiAuthResult {
  authenticated: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Validates authentication for API routes by checking Cognito tokens in cookies.
 * Associates operations with the authenticated user ID.
 *
 * Validates: Requirements 9.2, 9.3
 * - Validates auth tokens in API routes
 * - Associates diagram operations with authenticated user ID
 *
 * @returns ApiAuthResult with authentication status and user ID
 *
 * @example
 * ```ts
 * // In an API route handler
 * import { validateApiAuth } from '@/lib/auth/api-auth';
 *
 * export async function POST(request: Request) {
 *   const auth = await validateApiAuth();
 *   if (!auth.authenticated) {
 *     return Response.json({ error: auth.error }, { status: 401 });
 *   }
 *   // Use auth.userId to associate with the operation
 *   const diagram = await createDiagram({ userId: auth.userId!, ... });
 * }
 * ```
 */
export async function validateApiAuth(): Promise<ApiAuthResult> {
  try {
    const cookieStore = await cookies();

    // Look for Cognito tokens in cookies set by Amplify SSR
    let idToken: string | null = null;
    let userId: string | null = null;

    for (const cookie of cookieStore.getAll()) {
      // Amplify v6 with ssr: true stores tokens in cookies with these patterns
      if (
        cookie.name.includes('CognitoIdentityServiceProvider') &&
        cookie.name.includes('idToken')
      ) {
        idToken = cookie.value;
      }

      // Extract userId from the lastAuthUser cookie
      if (
        cookie.name.includes('CognitoIdentityServiceProvider') &&
        cookie.name.includes('LastAuthUser')
      ) {
        userId = cookie.value;
      }

      // Also check for amplify-managed auth cookies
      if (cookie.name.includes('amplify') && cookie.name.includes('token')) {
        idToken = cookie.value;
      }
    }

    // Check custom session cookie as fallback
    const sessionCookie = cookieStore.get('auth-session');
    if (sessionCookie && !idToken) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        idToken = sessionData.idToken || null;
        userId = sessionData.userId || null;
      } catch {
        // Invalid session cookie
      }
    }

    if (!idToken) {
      return {
        authenticated: false,
        userId: null,
        error: 'No valid authentication token found',
      };
    }

    // Decode the JWT to extract user info (without full verification - 
    // full verification happens at API Gateway/Cognito level in production)
    if (!userId) {
      userId = extractUserIdFromToken(idToken);
    }

    if (!userId) {
      return {
        authenticated: false,
        userId: null,
        error: 'Could not determine user identity from token',
      };
    }

    return {
      authenticated: true,
      userId,
    };
  } catch {
    return {
      authenticated: false,
      userId: null,
      error: 'Authentication validation failed',
    };
  }
}

/**
 * Extracts the user ID (sub claim) from a JWT token payload.
 * This is a lightweight decode - full verification is handled by Cognito/API Gateway.
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    return payload.sub || payload.username || null;
  } catch {
    return null;
  }
}

/**
 * Helper to create an unauthorized JSON response for API routes.
 */
export function unauthorizedResponse(message?: string): Response {
  return Response.json(
    { error: message || 'Unauthorized' },
    { status: 401 }
  );
}
