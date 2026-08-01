'use client';

import React, { Suspense, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { PromptInput } from '@/components/create/PromptInput';
import { GenerationProgress } from '@/components/create/GenerationProgress';
import { GenerationError } from '@/components/create/GenerationError';
import { useGenerationState } from '@/hooks/useGenerationState';
import { useTemplates } from '@/hooks/useTemplates';
import {
  createApiError,
  createParseError,
  createTimeoutError,
  createNetworkError,
  type GenerationError as GenerationErrorData,
} from '@/lib/errors/generation-errors';
import { generateDiagram, ApiError } from '@/api';

/**
 * Create Diagram page content.
 *
 * Integrates the PromptInput component with a template selector,
 * wires the generate button to POST /api/diagrams/generate,
 * navigates to the Diagram Viewer on success, and shows
 * GenerationProgress during processing and GenerationError on failure.
 *
 * Supports `?template=<id>` query param for pre-selecting a template.
 *
 * Validates: Requirements 11.2
 */
function CreateDiagramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateParam = searchParams.get('template');

  const { state, isProcessing, startGeneration, setStep, setReady, setError, reset } =
    useGenerationState();

  const { templates, isLoading: templatesLoading, getTemplateById } = useTemplates();

  const [generationError, setGenerationError] = React.useState<GenerationErrorData | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(
    templateParam
  );
  const [lastPrompt, setLastPrompt] = React.useState<string>('');
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Pre-select template from query param
  useEffect(() => {
    if (templateParam) {
      setSelectedTemplateId(templateParam);
    }
  }, [templateParam]);

  const selectedTemplate = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;

  /**
   * Handles the diagram generation flow.
   * Uses the API client which routes to local Next.js routes or API Gateway.
   */
  const handleGenerate = useCallback(
    async (prompt: string) => {
      setLastPrompt(prompt);
      setGenerationError(null);
      startGeneration();

      try {
        const data = await generateDiagram({
          prompt,
          templateId: selectedTemplateId || undefined,
        });

        // Success: transition to generating-diagram step
        setStep('generating-diagram');

        // Transition to analyzing step briefly
        setStep('analyzing');

        // Mark as ready
        setReady();

        // Navigate to the diagram viewer
        if (data.diagramId) {
          router.push(`/diagram/${data.diagramId}`);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          const body = error.body as Record<string, unknown> | undefined;
          const code = body?.code as string | undefined;

          // Handle specific error codes from the API
          if (error.status === 422 && code === 'PARSE_FAILURE') {
            const parseError = createParseError(prompt);
            if (body?.suggestions) {
              parseError.suggestions = body.suggestions as string[];
            }
            setError({ message: parseError.message, suggestions: parseError.suggestions });
            setGenerationError(parseError);
            return;
          }

          if (error.status === 504 || code === 'TIMEOUT') {
            const timeoutError = createTimeoutError();
            setError({ message: timeoutError.message });
            setGenerationError(timeoutError);
            return;
          }

          // Generic API error
          const apiError = createApiError(error.status);
          setError({ message: apiError.message });
          setGenerationError(apiError);
          return;
        }

        // Network or unexpected error
        const networkError = createNetworkError();
        setError({ message: networkError.message });
        setGenerationError(networkError);
      }
    },
    [selectedTemplateId, startGeneration, setStep, setReady, setError, router]
  );

  /**
   * Retries the last generation attempt.
   */
  const handleRetry = useCallback(async () => {
    if (!lastPrompt) return;
    setIsRetrying(true);
    setGenerationError(null);
    reset();
    await handleGenerate(lastPrompt);
    setIsRetrying(false);
  }, [lastPrompt, reset, handleGenerate]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Create Diagram
        </h1>
        <p className="mt-1 text-muted-foreground">
          Describe your AWS architecture in plain English and generate a professional diagram.
        </p>
      </div>

      {/* Template Selector Section */}
      <section aria-labelledby="template-selector-heading">
        <div className="flex items-center justify-between">
          <h2
            id="template-selector-heading"
            className="text-lg font-semibold text-foreground"
          >
            Start from a template
          </h2>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse all templates
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templatesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg border border-border bg-muted/50"
                aria-hidden="true"
              />
            ))
          ) : (
            templates.slice(0, 6).map((template) => (
              <button
                key={template.templateId}
                type="button"
                onClick={() =>
                  setSelectedTemplateId(
                    selectedTemplateId === template.templateId
                      ? null
                      : template.templateId
                  )
                }
                className={`group rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  selectedTemplateId === template.templateId
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                }`}
                aria-pressed={selectedTemplateId === template.templateId}
              >
                <div className="flex items-center gap-2">
                  <LayoutTemplate
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-card-foreground group-hover:text-primary">
                    {template.name}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {template.description}
                </p>
              </button>
            ))
          )}
        </div>

        {selectedTemplate && (
          <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-sm text-foreground">
              <span className="font-medium">Selected:</span> {selectedTemplate.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedTemplate.description}
            </p>
          </div>
        )}
      </section>

      {/* Prompt Input Section */}
      <section aria-labelledby="prompt-section-heading">
        <h2 id="prompt-section-heading" className="sr-only">
          Architecture Description
        </h2>
        <PromptInput
          onGenerate={handleGenerate}
          isGenerating={isProcessing}
        />
      </section>

      {/* Generation Progress */}
      {isProcessing && (
        <GenerationProgress state={state} />
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

/**
 * Create Diagram page with Suspense boundary for useSearchParams.
 * Validates: Requirements 11.2
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
