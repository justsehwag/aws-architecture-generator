'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Higher-order component for client-side route protection.
 * Wraps a page component and redirects to login if the user is not authenticated.
 *
 * This provides a second layer of protection in addition to the middleware.
 * The middleware handles server-side redirects, while this handles client-side
 * navigation and SPA route transitions.
 *
 * Validates: Requirements 9.2 - Redirect unauthenticated users to login page
 *
 * @example
 * ```tsx
 * function CreateDiagramPage() {
 *   return <div>Protected content</div>;
 * }
 * export default withAuth(CreateDiagramPage);
 * ```
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  function AuthGuard(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        const currentPath = window.location.pathname;
        router.replace(`/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      }
    }, [isAuthenticated, isLoading, router]);

    // Show nothing while loading or redirecting
    if (isLoading) {
      return null;
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  }

  AuthGuard.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthGuard;
}
