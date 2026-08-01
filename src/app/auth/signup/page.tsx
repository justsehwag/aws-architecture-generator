'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

function SignupContent() {
  const router = useRouter();
  const { signUp, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signUp({ email, password, name });
    setSuccess(true);
  };

  if (isAuthenticated) {
    router.push('/');
    return null;
  }

  if (success && !error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a verification code to <strong>{email}</strong>. Enter it below to verify your account.
            </p>
            <a
              href={`/auth/verify?email=${encodeURIComponent(email)}`}
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Enter Verification Code
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up to start generating AWS architecture diagrams
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none">
                Name (optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

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
                autoComplete="email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Must include uppercase, lowercase, and a number
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><p>Loading...</p></div>}>
      <SignupContent />
    </Suspense>
  );
}
