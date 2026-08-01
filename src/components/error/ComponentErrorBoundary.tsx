'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * ComponentErrorBoundary - Component-level error boundary.
 * Validates: Requirements 13.1, 13.3, 13.5
 *
 * Catches component-level errors (e.g., canvas rendering failures)
 * and shows an inline error without affecting sibling components.
 * Retains structured JSON for user-initiated retry on diagram engine failures.
 */

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  /** Human-readable label for what this boundary wraps (e.g., "Diagram Canvas") */
  componentName?: string;
  /** Optional fallback to render instead of default inline error */
  fallback?: ReactNode;
  /** Optional callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional structured data to preserve during error state (e.g., JSON spec) */
  preservedData?: unknown;
  /** Optional custom retry handler */
  onRetry?: () => void;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  private preservedDataSnapshot: unknown = null;

  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ComponentErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ComponentErrorBoundary:${this.props.componentName ?? 'unknown'}] Error:`,
      error
    );
    console.error(
      `[ComponentErrorBoundary:${this.props.componentName ?? 'unknown'}] Stack:`,
      errorInfo.componentStack
    );

    // Preserve structured data (e.g., architecture JSON) for retry
    if (this.props.preservedData !== undefined) {
      this.preservedDataSnapshot = this.props.preservedData;
      try {
        sessionStorage.setItem(
          `error_preserved_${this.props.componentName ?? 'component'}`,
          JSON.stringify(this.props.preservedData)
        );
      } catch {
        // sessionStorage may not be available
      }
    }

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.setState({
      hasError: false,
      error: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  /**
   * Retrieves preserved data that was saved during the error.
   * Useful for diagram engine failures where the JSON spec should be retained.
   */
  getPreservedData(): unknown {
    if (this.preservedDataSnapshot !== null) {
      return this.preservedDataSnapshot;
    }
    try {
      const stored = sessionStorage.getItem(
        `error_preserved_${this.props.componentName ?? 'component'}`
      );
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const displayName = this.props.componentName ?? 'This component';

      return (
        <div
          className="flex items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-foreground">
              {displayName} could not be displayed
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              An error occurred while rendering. Your data has been preserved.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Retry loading ${displayName}`}
            >
              Retry
            </button>
            {this.state.retryCount > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Retry attempts: {this.state.retryCount}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
