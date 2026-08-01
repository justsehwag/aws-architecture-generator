import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protected routes that require authentication.
 * Unauthenticated users are redirected to the login page.
 *
 * Validates: Requirements 9.2 - Redirect unauthenticated users to login page
 * and prevent access to Create Diagram, Diagram Viewer, and Templates pages.
 */
const PROTECTED_ROUTES = ['/create', '/diagram', '/templates'];

/**
 * Cookie name used by AWS Amplify to store the last authenticated user.
 * Amplify v6 stores the auth token info in cookies with this key pattern.
 */
function hasAuthCookie(request: NextRequest): boolean {
  const cookies = request.cookies;

  // AWS Amplify v6 stores auth state in cookies with patterns like:
  // CognitoIdentityServiceProvider.<clientId>.<username>.idToken
  // or the simpler lastAuthUser cookie
  const allCookies = cookies.getAll();
  for (const cookie of allCookies) {
    if (
      cookie.name.includes('CognitoIdentityServiceProvider') &&
      cookie.name.includes('idToken')
    ) {
      return true;
    }
    // Amplify v6 with ssr: true stores tokens under this pattern
    if (cookie.name.includes('amplify') && cookie.name.includes('token')) {
      return true;
    }
  }

  // Also check for a custom session cookie we set during sign-in
  if (cookies.has('auth-session')) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a protected route
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

  // Redirect unauthenticated users to the login page
  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/create/:path*', '/diagram/:path*', '/templates/:path*'],
};
