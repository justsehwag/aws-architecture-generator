"use client";

import * as React from "react";
import type { TemplateCategory, TemplateListItem } from "@/types/template";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// --- Category display helpers ---

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  "web-application": "Web App",
  serverless: "Serverless",
  microservices: "Microservices",
  "ai-ml": "AI / ML",
  "data-analytics": "Data Analytics",
  enterprise: "Enterprise",
  "event-driven": "Event-Driven",
  iot: "IoT",
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  "web-application": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  serverless: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  microservices: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "ai-ml": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "data-analytics": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  enterprise: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "event-driven": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  iot: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

// --- Props ---

export interface TemplateCardProps {
  template: TemplateListItem;
  isSelected?: boolean;
  isLoading?: boolean;
  onSelect: (templateId: string) => void;
  onUseTemplate: (templateId: string) => void;
}

/**
 * TemplateCard component
 *
 * Displays a single template with name, category badge, truncated description,
 * and use case count. Supports hover/focus states for accessibility.
 *
 * Validates: Requirements 5.3, 5.6
 */
export function TemplateCard({
  template,
  isSelected = false,
  isLoading = false,
  onSelect,
  onUseTemplate,
}: TemplateCardProps) {
  const descriptionPreview =
    template.description.length > 120
      ? template.description.slice(0, 120) + "…"
      : template.description;

  const handleCardClick = () => {
    onSelect(template.templateId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(template.templateId);
    }
  };

  const handleUseTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUseTemplate(template.templateId);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Template: ${template.name}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex flex-col rounded-lg border p-4 transition-all duration-150",
        "hover:shadow-md hover:border-primary/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-background"
      )}
    >
      {/* Header: Name + Category Badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight text-foreground">
          {template.name}
        </h3>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
            CATEGORY_COLORS[template.category]
          )}
        >
          {CATEGORY_LABELS[template.category]}
        </span>
      </div>

      {/* Description preview */}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
        {descriptionPreview}
      </p>

      {/* Footer: Use cases count + Use button */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {template.useCases.length} use case{template.useCases.length !== 1 ? "s" : ""}
        </span>
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          onClick={handleUseTemplate}
          disabled={isLoading}
          aria-label={`Use ${template.name} template`}
          className="h-7 px-2.5 text-xs"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="mr-1 h-3 w-3 animate-spin" />
              Loading…
            </>
          ) : (
            "Use Template"
          )}
        </Button>
      </div>

      {/* Built-in indicator */}
      {template.isBuiltIn && (
        <div className="absolute right-2 top-2 hidden group-hover:block">
          <span className="text-[10px] text-muted-foreground/70">Built-in</span>
        </div>
      )}
    </article>
  );
}

// --- Inline icons ---

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

export { CATEGORY_LABELS, CATEGORY_COLORS };
