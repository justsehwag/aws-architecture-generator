"use client";

import * as React from "react";
import type { TemplateCategory, TemplateListItem } from "@/types/template";
import { useTemplates } from "@/hooks/useTemplates";
import { TemplateCard, CATEGORY_LABELS } from "./TemplateCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- All template categories for filter ---

const ALL_CATEGORIES: TemplateCategory[] = [
  "web-application",
  "serverless",
  "microservices",
  "ai-ml",
  "data-analytics",
  "enterprise",
  "event-driven",
  "iot",
];

// --- Props ---

export interface TemplateGalleryProps {
  /** Called when a template is successfully loaded, passes the diagram ID */
  onTemplateLoaded?: (diagramId: string) => void;
  /** Additional CSS class names */
  className?: string;
}

/**
 * TemplateGallery component
 *
 * Displays a browsable list of templates with search by name/description,
 * filter by category, and template selection with expanded details.
 * Loads selected template into the Diagram Viewer within 3 seconds.
 * Shows template description (50-500 chars) and at least 2 use cases.
 * Handles template load failures preserving current diagram state.
 *
 * Validates: Requirements 5.2, 5.3, 5.5, 5.6
 */
export function TemplateGallery({
  onTemplateLoaded,
  className,
}: TemplateGalleryProps) {
  const {
    filteredTemplates,
    isLoading,
    fetchError,
    loadStatus,
    loadError,
    searchQuery,
    categoryFilter,
    setSearchQuery,
    setCategoryFilter,
    loadTemplate,
    resetLoadState,
    getTemplateById,
  } = useTemplates();

  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [loadingTemplateId, setLoadingTemplateId] = React.useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get the full details for the selected template
  const selectedTemplate = selectedTemplateId
    ? getTemplateById(selectedTemplateId)
    : null;

  // Debounced search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 250);
  };

  // Cleanup debounce timer
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle selecting a template to view details
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId((prev) => (prev === templateId ? null : templateId));
    resetLoadState();
  };

  // Handle loading a template into the diagram viewer
  const handleUseTemplate = async (templateId: string) => {
    setLoadingTemplateId(templateId);
    resetLoadState();

    const result = await loadTemplate(templateId);

    setLoadingTemplateId(null);

    if (result) {
      onTemplateLoaded?.(result);
    }
    // On failure: loadError is set by the hook, current diagram state is preserved
  };

  // Handle category filter click
  const handleCategoryClick = (category: TemplateCategory | null) => {
    setCategoryFilter(category === categoryFilter ? null : category);
  };

  return (
    <section
      className={cn("flex flex-col gap-4", className)}
      aria-label="Template Gallery"
    >
      {/* Search bar */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search templates by name or description…"
          defaultValue={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search templates"
          className={cn(
            "w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        />
      </div>

      {/* Category filter tabs */}
      <div
        className="flex flex-wrap gap-1.5"
        role="toolbar"
        aria-label="Filter by category"
      >
        <Button
          size="sm"
          variant={categoryFilter === null ? "default" : "outline"}
          onClick={() => handleCategoryClick(null)}
          className="h-7 px-2.5 text-xs"
        >
          All
        </Button>
        {ALL_CATEGORIES.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={categoryFilter === cat ? "default" : "outline"}
            onClick={() => handleCategoryClick(cat)}
            className="h-7 px-2.5 text-xs"
          >
            {CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Error alert for load failures */}
      {loadStatus === "error" && loadError && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-medium text-destructive">
            Failed to load template
          </p>
          <p className="mt-1 text-xs text-destructive/90">{loadError}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your current diagram remains unchanged.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading templates…
          </span>
        </div>
      )}

      {/* Fetch error state */}
      {fetchError && !isLoading && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{fetchError}</p>
        </div>
      )}

      {/* Template grid */}
      {!isLoading && (
        <>
          {filteredTemplates.length === 0 ? (
            <div className="py-8 text-center" role="status">
              <p className="text-sm text-muted-foreground">
                No templates match your search.
              </p>
              {(searchQuery || categoryFilter) && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter(null);
                    if (searchInputRef.current) {
                      searchInputRef.current.value = "";
                    }
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div
              className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              role="list"
              aria-label="Available templates"
            >
              {filteredTemplates.map((template) => (
                <div key={template.templateId} role="listitem">
                  <TemplateCard
                    template={template}
                    isSelected={selectedTemplateId === template.templateId}
                    isLoading={loadingTemplateId === template.templateId}
                    onSelect={handleSelectTemplate}
                    onUseTemplate={handleUseTemplate}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Expanded template details panel */}
      {selectedTemplate && (
        <TemplateDetailPanel
          template={selectedTemplate}
          isLoading={loadingTemplateId === selectedTemplate.templateId}
          onUseTemplate={handleUseTemplate}
          onClose={() => setSelectedTemplateId(null)}
        />
      )}
    </section>
  );
}

// --- Template Detail Panel ---

interface TemplateDetailPanelProps {
  template: TemplateListItem;
  isLoading: boolean;
  onUseTemplate: (templateId: string) => void;
  onClose: () => void;
}

function TemplateDetailPanel({
  template,
  isLoading,
  onUseTemplate,
  onClose,
}: TemplateDetailPanelProps) {
  return (
    <div
      className="rounded-lg border border-border bg-muted/30 p-4"
      role="region"
      aria-label={`Details for ${template.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {template.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {template.description}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close template details"
          className="shrink-0 rounded-sm p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Use cases */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-foreground">Use Cases</h4>
        <ul className="mt-2 space-y-1.5" aria-label="Template use cases">
          {template.useCases.map((useCase, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
              <span>{useCase}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action button */}
      <div className="mt-4 flex justify-end">
        <Button
          onClick={() => onUseTemplate(template.templateId)}
          disabled={isLoading}
          aria-label={`Load ${template.name} template`}
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
              Loading template…
            </>
          ) : (
            "Load Template"
          )}
        </Button>
      </div>
    </div>
  );
}

// --- Inline icons ---

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
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
