import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Extracts the user ID (sub claim) from Cognito JWT stored in cookies.
 * Decodes the JWT payload without verification (middleware runs on edge).
 */
function extractUserIdFromCookies(request: NextRequest): string | null {
  const cookies = request.cookies;
  const allCookies = cookies.getAll();

  // Find the idToken cookie
  for (const cookie of allCookies) {
    if (
      cookie.name.includes('CognitoIdentityServiceProvider') &&
      cookie.name.includes('idToken')
    ) {
      try {
        // JWT is base64url encoded: header.payload.signature
        const parts = cookie.value.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8')
          );
          return payload.sub || payload['cognito:username'] || null;
        }
      } catch {
        return null;
      }
    }
  }

  // Fallback: check lastAuthUser cookie
  for (const cookie of allCookies) {
    if (cookie.name.includes('LastAuthUser')) {
      return cookie.value;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For API routes, try to extract user ID from auth cookies (if available)
  if (pathname.startsWith('/api/')) {
    const userId = extractUserIdFromCookies(request);
    if (userId) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', userId);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  // All routes are public for demo mode
  return NextResponse.next();
}

export const config = {
  matcher: ['/create/:path*', '/diagram/:path*', '/templates/:path*', '/api/:path*'],
};
