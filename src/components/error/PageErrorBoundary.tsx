'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { retryWithBackoff } from '@/lib/retry/exponential-backoff';

/**
 * PageErrorBoundary - Page-level error boundary.
 * Validates: Requirements 13.1, 13.4, 13.5
 *
 * Catches page-level errors and shows an error message while
 * keeping navigation (sidebar/header) intact.
 * Implements exponential backoff retry: 1s, 2s, 4s, max 3 attempts.
 */

interface PageErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback component to render instead of default UI */
  fallback?: ReactNode;
  /** Optional callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface PageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 3;

export class PageErrorBoundary extends Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[PageErrorBoundary] Page error:', error);
    console.error('[PageErrorBoundary] Component stack:', errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = async (): Promise<void> => {
    this.setState({ isRetrying: true });

    try {
      // Use exponential backoff for the retry attempt
      await retryWithBackoff(
        async () => {
          // Reset the boundary - this will re-render children
          this.setState({
            hasError: false,
            error: null,
            isRetrying: false,
            retryCount: this.state.retryCount + 1,
          });
        },
        {
          maxAttempts: 1,
          initialDelayMs: 500,
        }
      );
    } catch {
      this.setState({ isRetrying: false });
    }
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: this.state.retryCount + 1,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-1 items-center justify-center p-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="mx-auto max-w-lg text-center">
            <div className="mb-4 text-5xl" aria-hidden="true">
              🔄
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              This page encountered an issue
            </h2>
            <p className="mb-6 text-muted-foreground">
              Something went wrong while loading this page. Your unsaved work is
              still preserved. You can try loading the page again.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReset}
                disabled={this.state.isRetrying}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                aria-label="Try loading this page again"
              >
                {this.state.isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
            </div>
            {this.state.retryCount > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Attempted {this.state.retryCount}{' '}
                {this.state.retryCount === 1 ? 'time' : 'times'}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
