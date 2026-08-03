'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PromptInput } from '@/components/create/PromptInput';
import { GenerationProgress } from '@/components/create/GenerationProgress';
import { GenerationError } from '@/components/create/GenerationError';
import { ThemeToggle } from '@/components/create/ThemeToggle';
import { PromptGenerator } from '@/components/create/PromptGenerator';
import { useGenerationState } from '@/hooks/useGenerationState';
import { useDrawioGenerator } from '@/hooks/useDrawioGenerator';
import { useAuthGate } from '@/hooks/useAuthGate';
import {
  createApiError,
  createParseError,
  createTimeoutError,
  createNetworkError,
  type GenerationError as GenerationErrorData,
} from '@/lib/errors/generation-errors';

type CreateMode = 'manual' | 'generator';

/**
 * Create Diagram page content.
 *
 * Integrates the PromptInput component with prompt generator mode,
 * wires the generate button to the Lambda Function URL,
 * navigates to the Diagram Viewer on success, and shows
 * GenerationProgress during processing and GenerationError on failure.
 *
 * Auth-gated: page is publicly viewable but generation actions require authentication.
 */
function CreateDiagramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { state, isProcessing, startGeneration, setStep, setReady, setError, reset } =
    useGenerationState();

  const { guardAction, isAuthenticated } = useAuthGate();

  // New Draw.io Generator hook (Lambda Function URL - primary generation method)
  const {
    generate: generateDrawio,
    drawioXml,
    diagramId: drawioId,
    isGenerating: isDrawioGenerating,
    error: drawioError,
    reset: resetDrawio,
  } = useDrawioGenerator();

  const [generationError, setGenerationError] = React.useState<GenerationErrorData | null>(null);
  const [lastPrompt, setLastPrompt] = React.useState<string>('');
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('manual');
  const [sharedPrompt, setSharedPrompt] = useState<string>('');

  // Watch for successful generation from the drawio generator hook
  useEffect(() => {
    if (drawioXml && drawioId) {
      // Generate a meaningful name from the prompt (first 60 chars)
      const diagramName = lastPrompt
        ? lastPrompt.slice(0, 60).trim() + (lastPrompt.length > 60 ? '...' : '')
        : 'Architecture Diagram';

      try {
        sessionStorage.setItem(`diagram_${drawioId}`, JSON.stringify({
          diagramId: drawioId,
          drawioXml,
          name: diagramName,
        }));
      } catch {}
      setStep('generating-diagram');
      setStep('analyzing');
      setReady();
      router.push(`/diagram/${drawioId}`);
    }
  }, [drawioXml, drawioId, router, setStep, setReady, lastPrompt]);

  // Handle errors from the drawio generator hook
  useEffect(() => {
    if (drawioError) {
      let mappedError: GenerationErrorData;

      switch (drawioError.code) {
        case 'TIMEOUT':
          mappedError = createTimeoutError();
          break;
        case 'NETWORK_ERROR':
          mappedError = createNetworkError();
          break;
        case 'SERVICE_NOT_CONFIGURED':
          mappedError = createApiError(503);
          break;
        case 'MODEL_ACCESS_DENIED':
          mappedError = createApiError(503);
          break;
        case 'INVALID_PROMPT':
          mappedError = createApiError(400);
          break;
        case 'INVALID_XML':
          mappedError = createApiError(422);
          break;
        case 'LLM_ERROR':
          mappedError = createApiError(502);
          break;
        default:
          mappedError = createApiError(500);
          break;
      }

      setError({ message: drawioError.error });
      setGenerationError(mappedError);
    }
  }, [drawioError, setError]);

  /**
   * Handles the diagram generation flow.
   * Auth-gated: requires authentication.
   */
  const handleGenerate = useCallback(
    (prompt: string) => {
      guardAction(async () => {
        setLastPrompt(prompt);
        setGenerationError(null);
        resetDrawio();
        startGeneration();
        await generateDrawio(prompt);
      });
    },
    [guardAction, startGeneration, generateDrawio, resetDrawio]
  );

  /**
   * Retries the last generation attempt.
   */
  const handleRetry = useCallback(async () => {
    if (!lastPrompt) return;
    setIsRetrying(true);
    setGenerationError(null);
    reset();
    resetDrawio();
    handleGenerate(lastPrompt);
    setIsRetrying(false);
  }, [lastPrompt, reset, resetDrawio, handleGenerate]);

  /**
   * When prompt generator produces a prompt, switch to manual mode
   * and populate the shared prompt state.
   */
  const handlePromptGenerated = useCallback((prompt: string) => {
    setSharedPrompt(prompt);
    setCreateMode('manual');
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create Diagram
          </h1>
          <p className="mt-1 text-muted-foreground">
            Describe your AWS architecture in plain English and generate a professional diagram.
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Templates link preserved */}
      <div className="flex justify-end">
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Browse templates
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          type="button"
          onClick={() => setCreateMode('manual')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            createMode === 'manual'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Manual Prompt
        </button>
        <button
          type="button"
          onClick={() => setCreateMode('generator')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            createMode === 'generator'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Prompt Generator
        </button>
      </div>

      {/* Prompt Input Section */}
      <section aria-labelledby="prompt-section-heading">
        <h2 id="prompt-section-heading" className="sr-only">
          Architecture Description
        </h2>
        {createMode === 'manual' ? (
          <PromptInput
            onGenerate={handleGenerate}
            isGenerating={isDrawioGenerating || isProcessing}
            defaultValue={sharedPrompt}
            key={sharedPrompt}
          />
        ) : (
          <PromptGenerator
            onPromptGenerated={handlePromptGenerated}
            isDisabled={isDrawioGenerating || isProcessing || !isAuthenticated}
          />
        )}
      </section>

      {/* Enhanced Generation Progress */}
      {(isDrawioGenerating || isProcessing) && (
        <EnhancedGenerationProgress state={state} />
      )}

      {/* Generation Error */}
      {generationError && state.status === 'error' && (
        <GenerationError
          error={generationError}
          onRetry={generationError.retryable ? handleRetry : undefined}
          isRetrying={isRetrying}
        />
      )}
    </div>
  );
}

// --- Enhanced Generation Progress UI (Requirement 2) ---

interface EnhancedProgressProps {
  state: ReturnType<typeof useGenerationState>['state'];
}

const PROGRESS_STEPS = [
  { label: 'Interpreting prompt...', threshold: 0 },
  { label: 'Generating architecture...', threshold: 5000 },
  { label: 'Rendering diagram...', threshold: 15000 },
];

function EnhancedGenerationProgress({ state }: EnhancedProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = React.useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentStepIndex = PROGRESS_STEPS.reduce((acc, step, i) => {
    return elapsed >= step.threshold ? i : acc;
  }, 0);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div
      className="rounded-lg border bg-card p-6 space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Generation in progress"
    >
      {/* Header with timer */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Generating architecture diagram</p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Animated progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-primary rounded-full animate-pulse-slide" />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {PROGRESS_STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-md px-3 py-2 transition-all duration-300 ${
                isActive ? 'bg-primary/5' : ''
              } ${isComplete ? 'opacity-60' : ''}`}
            >
              <div className="flex-shrink-0">
                {isActive ? (
                  <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : isComplete ? (
                  <svg className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
              <span className={`text-sm ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Shimmer skeleton placeholder */}
      <div className="mt-4 rounded-lg overflow-hidden">
        <div
          className="h-32 w-full rounded-lg"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Create Diagram page with Suspense boundary for useSearchParams.
 */
export default function CreateDiagramPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Create Diagram
            </h1>
            <p className="mt-1 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <CreateDiagramContent />
    </Suspense>
  );
}
