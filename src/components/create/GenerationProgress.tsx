'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { GenerationState, GenerationStatus } from '@/hooks/useGenerationState';

interface GenerationProgressProps {
  state: GenerationState;
  className?: string;
}

interface StepInfo {
  label: string;
  description: string;
}

const STEP_CONFIG: Record<Exclude<GenerationStatus, 'idle' | 'ready' | 'error'>, StepInfo> = {
  interpreting: {
    label: 'Interpreting prompt...',
    description: 'Understanding your architecture description',
  },
  'generating-diagram': {
    label: 'Generating diagram...',
    description: 'Creating AWS architecture diagram with official icons',
  },
  analyzing: {
    label: 'Analyzing architecture...',
    description: 'Evaluating best practices and recommendations',
  },
};

const STEP_ORDER: Array<Exclude<GenerationStatus, 'idle' | 'ready' | 'error'>> = [
  'interpreting',
  'generating-diagram',
  'analyzing',
];

function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin h-5 w-5', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function StepIndicator({
  step,
  currentStep,
  index,
}: {
  step: Exclude<GenerationStatus, 'idle' | 'ready' | 'error'>;
  currentStep: GenerationStatus;
  index: number;
}) {
  const currentIndex = STEP_ORDER.indexOf(
    currentStep as Exclude<GenerationStatus, 'idle' | 'ready' | 'error'>
  );
  const isActive = step === currentStep;
  const isComplete = currentStep === 'ready' || currentIndex > index;
  const config = STEP_CONFIG[step];

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
        isActive && 'bg-primary/5',
        isComplete && 'opacity-70'
      )}
    >
      <div className="flex-shrink-0">
        {isActive ? (
          <Spinner className="text-primary" />
        ) : isComplete ? (
          <svg
            className="h-5 w-5 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            isActive ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {config.label}
        </p>
        {isActive && (
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        )}
      </div>
    </div>
  );
}

export function GenerationProgress({ state, className }: GenerationProgressProps) {
  const { status, elapsedMs } = state;

  // Don't render anything in idle state
  if (status === 'idle') {
    return null;
  }

  // Ready state
  if (status === 'ready') {
    return (
      <div
        className={cn('rounded-lg border bg-card p-4', className)}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-medium text-foreground">
            Diagram generated successfully
          </p>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {formatElapsedTime(elapsedMs)}
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div
        className={cn('rounded-lg border border-destructive/50 bg-destructive/5 p-4', className)}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-destructive"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">
              {state.error?.message ?? 'An error occurred during generation'}
            </p>
            {state.error?.suggestions && state.error.suggestions.length > 0 && (
              <ul className="mt-2 space-y-1">
                {state.error.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Processing states (interpreting, generating-diagram, analyzing)
  const isProcessing =
    status === 'interpreting' || status === 'generating-diagram' || status === 'analyzing';

  if (!isProcessing) {
    return null;
  }

  return (
    <div
      className={cn('rounded-lg border bg-card p-4', className)}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Generation in progress: ${STEP_CONFIG[status].label}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">Generating architecture diagram</p>
        <span className="text-xs text-muted-foreground tabular-nums" aria-label={`Elapsed time: ${formatElapsedTime(elapsedMs)}`}>
          {formatElapsedTime(elapsedMs)}
        </span>
      </div>

      {/* Animated pulse bar */}
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-4">
        <div className="h-full w-1/3 bg-primary rounded-full animate-pulse-slide" />
      </div>

      {/* Step indicators */}
      <div className="space-y-1">
        {STEP_ORDER.map((step, index) => (
          <StepIndicator
            key={step}
            step={step}
            currentStep={status}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
