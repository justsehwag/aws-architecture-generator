/**
 * TemplateDetail Component
 *
 * Expanded template view showing full description, all use cases,
 * and a "Use Template" button. Displayed as a modal panel.
 *
 * Validates: Requirements 5.2, 5.3, 5.5
 */

"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateListItem } from "@/types/template";
import type { TemplateLoadStatus } from "@/hooks/useTemplates";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "./TemplateCard";

// --- Props ---

interface TemplateDetailProps {
  template: TemplateListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (templateId: string) => void;
  loadStatus: TemplateLoadStatus;
  loadError: string | null;
}

// --- Component ---

export function TemplateDetail({
  template,
  open,
  onOpenChange,
  onUseTemplate,
  loadStatus,
  loadError,
}: TemplateDetailProps) {
  if (!template) return null;

  const isLoading = loadStatus === "loading";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          aria-describedby="template-detail-description"
        >
          {/* Header */}
          <Dialog.Title className="text-lg font-semibold">
            {template.name}
          </Dialog.Title>

          {/* Category badge */}
          <span
            className={cn(
              "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
              CATEGORY_COLORS[template.category]
            )}
          >
            {CATEGORY_LABELS[template.category]}
          </span>

          {/* Full description (50-500 chars) */}
          <Dialog.Description
            id="template-detail-description"
            className="mt-3 text-sm text-muted-foreground leading-relaxed"
          >
            {template.description}
          </Dialog.Description>

          {/* Use cases (at least 2) */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-foreground">Use Cases</h4>
            <ul className="mt-2 space-y-2" aria-label="Template use cases">
              {template.useCases.map((useCase, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error state */}
          {loadStatus === "error" && loadError && (
            <div
              className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm font-medium text-destructive">
                Template Load Failed
              </p>
              <p className="mt-1 text-xs text-destructive/90">{loadError}</p>
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Cancel</Button>
            </Dialog.Close>
            <Button
              onClick={() => onUseTemplate(template.templateId)}
              disabled={isLoading}
              aria-label={
                isLoading
                  ? "Loading template..."
                  : `Use ${template.name} template`
              }
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Use Template"
              )}
            </Button>
          </div>

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Close"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// --- Inline SVG icons ---

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
