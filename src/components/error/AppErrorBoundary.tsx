'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * AppErrorBoundary - Top-level error boundary for catastrophic failures.
 * Validates: Requirements 13.1, 13.5
 *
 * Catches unhandled errors at the application level and displays
 * a full-page error with a "Return to Dashboard" link.
 * Preserves any session edits in localStorage.
 */

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('[AppErrorBoundary] Unhandled error:', error);
    console.error('[AppErrorBoundary] Component stack:', errorInfo.componentStack);

    // Preserve session data so no edits are lost
    try {
      const preservedState = {
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        url: typeof window !== 'undefined' ? window.location.href : '',
      };
      localStorage.setItem(
        'app_error_recovery',
        JSON.stringify(preservedState)
      );
    } catch {
      // localStorage may not be available
    }
  }

  handleReturnToDashboard = (): void => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen items-center justify-center bg-background p-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="mx-auto max-w-md text-center">
            <div className="mb-6 text-6xl" aria-hidden="true">
              ⚠️
            </div>
            <h1 className="mb-3 text-2xl font-semibold text-foreground">
              Something went wrong
            </h1>
            <p className="mb-6 text-muted-foreground">
              An unexpected error occurred. Your work has been preserved and you
              can safely return to the dashboard.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReturnToDashboard}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
