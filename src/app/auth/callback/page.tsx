'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';

/**
 * OAuth callback page.
 * After GitHub login, Cognito redirects here with ?code=xxx
 * Amplify Auth automatically exchanges the code for tokens.
 * We wait for the user session to be available, then redirect.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const checkAuth = async () => {
      try {
        await getCurrentUser();
        // User is authenticated, redirect to dashboard
        router.replace('/');
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          setError('Authentication timed out. Please try again.');
        } else {
          // Wait and retry - Amplify may still be processing the code exchange
          setTimeout(checkAuth, 1000);
        }
      }
    };

    // Start checking after a brief delay for Amplify to process
    setTimeout(checkAuth, 1500);
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <a
            href="/auth/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
