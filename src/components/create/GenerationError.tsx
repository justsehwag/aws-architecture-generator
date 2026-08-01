'use client';

import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GenerationError as GenerationErrorData } from '@/lib/errors/generation-errors';

interface GenerationErrorProps {
  error: GenerationErrorData;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Error display component for diagram generation failures.
 * Shows contextual messages, alternative prompt suggestions, and retry controls.
 *
 * Validates: Requirements 1.4, 1.5, 1.6, 13.1
 */
export function GenerationError({
  error,
  onRetry,
  isRetrying = false,
  className,
}: GenerationErrorProps) {
  const Icon = error.type === 'network' ? WifiOff : AlertCircle;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/5 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-3">
          <p className="text-sm font-medium text-destructive">
            {error.message}
          </p>

          {/* Alternative prompt suggestions for parse errors */}
          {error.type === 'parse' &&
            error.suggestions &&
            error.suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Try one of these approaches:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {error.suggestions.slice(0, 3).map((suggestion, index) => (
                    <li
                      key={index}
                      className="text-sm text-muted-foreground"
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Retry button for retryable errors */}
          {error.retryable && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-2"
            >
              <RefreshCw
                className={cn(
                  'mr-2 h-4 w-4',
                  isRetrying && 'animate-spin'
                )}
                aria-hidden="true"
              />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
