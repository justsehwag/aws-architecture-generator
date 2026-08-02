import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/diagram', '/templates', '/settings', '/diagrams', '/import'];

function hasAuthCookie(request: NextRequest): boolean {
  const cookies = request.cookies;
  const allCookies = cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes('CognitoIdentityServiceProvider') && cookie.name.includes('idToken')) {
      return true;
    }
    if (cookie.name.includes('amplify') && cookie.name.includes('token')) {
      return true;
    }
  }
  if (cookies.has('auth-session')) {
    return true;
  }
  return false;
}

function extractUserIdFromCookies(request: NextRequest): string | null {
  const cookies = request.cookies;
  const allCookies = cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes('CognitoIdentityServiceProvider') && cookie.name.includes('idToken')) {
      try {
        const parts = cookie.value.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          return payload.sub || payload['cognito:username'] || null;
        }
      } catch { return null; }
    }
  }
  for (const cookie of allCookies) {
    if (cookie.name.includes('LastAuthUser')) return cookie.value;
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For API routes, extract user ID and forward as header
  if (pathname.startsWith('/api/')) {
    const userId = extractUserIdFromCookies(request);
    if (userId) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', userId);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check for auth cookies
  if (hasAuthCookie(request)) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/diagram/:path*', '/templates/:path*', '/settings/:path*', '/diagrams/:path*', '/import/:path*', '/api/:path*'],
};
