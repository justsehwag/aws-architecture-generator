'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmSignUp } from 'aws-amplify/auth';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold">Email Verified!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is verified. Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the verification code sent to your email
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium leading-none">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                maxLength={6}
                autoComplete="one-time-code"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center tracking-widest font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Didn&apos;t receive a code?{' '}
            <a href="/auth/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Resend
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><p>Loading...</p></div>}>
      <VerifyContent />
    </Suspense>
  );
}
