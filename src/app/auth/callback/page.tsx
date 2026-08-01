'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * OAuth callback page.
 * Cognito redirects here after GitHub login with an authorization code.
 * Amplify Auth handles the code exchange automatically.
 * We just redirect to the dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Amplify handles the OAuth code exchange via Hub listener.
    // Give it a moment to process, then redirect to home.
    const timer = setTimeout(() => {
      router.replace('/');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
