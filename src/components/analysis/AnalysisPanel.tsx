"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import type {
  ArchitectureAnalysis,
  PillarAssessment,
  Recommendation,
  RecommendationCategory,
  MissingComponent,
  Severity,
  WellArchitectedPillar,
} from "@/types/analysis";

// --- Constants ---

const SEVERITY_ORDER: Severity[] = ["critical", "recommended", "optional"];

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; className: string; badgeClassName: string }
> = {
  critical: {
    label: "Critical",
    className: "text-destructive",
    badgeClassName:
      "bg-destructive/10 text-destructive border-destructive/30",
  },
  recommended: {
    label: "Recommended",
    className: "text-amber-600 dark:text-amber-400",
    badgeClassName:
      "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  },
  optional: {
    label: "Optional",
    className: "text-blue-600 dark:text-blue-400",
    badgeClassName:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  },
};

const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  security: "Security",
  "high-availability": "High Availability",
  "cost-optimization": "Cost Optimization",
};

const PILLAR_LABELS: Record<WellArchitectedPillar, string> = {
  "operational-excellence": "Operational Excellence",
  security: "Security",
  reliability: "Reliability",
  "performance-efficiency": "Performance Efficiency",
  "cost-optimization": "Cost Optimization",
  sustainability: "Sustainability",
};

// --- Props ---

export interface AnalysisPanelProps {
  diagramId: string | null;
  className?: string;
}

/**
 * AnalysisPanel — side panel displaying architecture analysis results.
 *
 * Displays:
 * - Well-Architected Framework assessment (6 pillars with pass/fail indicators)
 * - Recommendations grouped by category (Security, High-Availability, Cost Optimization)
 * - Each recommendation with severity badge, title, and description
 * - "No issues found" message when a category has no gaps (Requirement 6.7)
 * - Missing components section with suggested additions
 * - Sorted by severity from Critical to Optional (Requirement 6.6)
 *
 * Validates: Requirements 6.6, 6.7
 */
export function AnalysisPanel({ diagramId, className }: AnalysisPanelProps) {
  const { status, data, error, refetch } = useAnalysis(diagramId);

  if (!diagramId) {
    return (
      <aside
        className={cn("flex flex-col border-l bg-background p-4", className)}
        aria-label="Architecture analysis"
      >
        <h2 className="text-lg font-semibold">Architecture Analysis</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Generate a diagram to see architecture analysis.
        </p>
      </aside>
    );
  }

  if (status === "loading") {
    return (
      <aside
        className={cn("flex flex-col border-l bg-background p-4", className)}
        aria-label="Architecture analysis"
        aria-busy="true"
      >
        <h2 className="text-lg font-semibold">Architecture Analysis</h2>
        <div className="mt-4 flex items-center gap-2" role="status">
          <SpinnerIcon className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Analyzing architecture...
          </span>
        </div>
      </aside>
    );
  }

  if (status === "error") {
    return (
      <aside
        className={cn("flex flex-col border-l bg-background p-4", className)}
        aria-label="Architecture analysis"
      >
        <h2 className="text-lg font-semibold">Architecture Analysis</h2>
        <div
          className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Retry analysis"
          >
            Retry
          </button>
        </div>
      </aside>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <aside
      className={cn(
        "flex flex-col overflow-y-auto border-l bg-background p-4",
        className
      )}
      aria-label="Architecture analysis"
    >
      <h2 className="text-lg font-semibold">Architecture Analysis</h2>

      {/* Well-Architected Assessment */}
      <WellArchitectedSection pillars={data.wellArchitected.pillars} />

      {/* Recommendations by category */}
      <RecommendationsSection recommendations={data.recommendations} />

      {/* Missing components */}
      <MissingComponentsSection components={data.missingComponents} />
    </aside>
  );
}

// --- Well-Architected Section ---

function WellArchitectedSection({
  pillars,
}: {
  pillars: PillarAssessment[];
}) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <section className="mt-4" aria-labelledby="wa-heading">
      <button
        type="button"
        id="wa-heading"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={expanded}
        aria-controls="wa-content"
      >
        <span>Well-Architected Framework</span>
        <ChevronIcon className="h-4 w-4" expanded={expanded} />
      </button>

      {expanded && (
        <div id="wa-content" className="mt-2 space-y-1.5">
          {pillars.map((pillar) => (
            <div
              key={pillar.pillar}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              {pillar.status === "no-gaps" ? (
                <CheckIcon className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <AlertIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              <span className="flex-1">
                {PILLAR_LABELS[pillar.pillar]}
              </span>
              <span
                className={cn(
                  "text-xs",
                  pillar.status === "no-gaps"
                    ? "text-green-600 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {pillar.status === "no-gaps" ? "Pass" : "Gaps Found"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// --- Recommendations Section ---

function RecommendationsSection({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const categories: RecommendationCategory[] = [
    "security",
    "high-availability",
    "cost-optimization",
  ];

  return (
    <section className="mt-4" aria-labelledby="rec-heading">
      <h3 id="rec-heading" className="px-1 text-sm font-semibold">
        Recommendations
      </h3>
      <div className="mt-2 space-y-3">
        {categories.map((category) => (
          <CategoryGroup
            key={category}
            category={category}
            recommendations={recommendations.filter(
              (r) => r.category === category
            )}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryGroup({
  category,
  recommendations,
}: {
  category: RecommendationCategory;
  recommendations: Recommendation[];
}) {
  const [expanded, setExpanded] = React.useState(true);
  const controlId = `cat-${category}-content`;

  // Sort by severity: Critical → Recommended → Optional
  const sorted = [...recommendations].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-t-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={expanded}
        aria-controls={controlId}
      >
        <span>{CATEGORY_LABELS[category]}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {recommendations.length}
          </span>
          <ChevronIcon className="h-4 w-4" expanded={expanded} />
        </span>
      </button>

      {expanded && (
        <div id={controlId} className="border-t border-border px-3 py-2">
          {sorted.length === 0 ? (
            <NoIssuesMessage category={category} />
          ) : (
            <ul className="space-y-2" aria-label={`${CATEGORY_LABELS[category]} recommendations`}>
              {sorted.map((rec) => (
                <RecommendationItem key={rec.id} recommendation={rec} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Displays "No issues found" per empty category.
 * Validates: Requirement 6.7
 */
function NoIssuesMessage({ category }: { category: RecommendationCategory }) {
  return (
    <div
      className="flex items-center gap-2 py-2 text-sm text-muted-foreground"
      role="status"
      aria-label={`No issues found for ${CATEGORY_LABELS[category]}`}
    >
      <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
      <span>No issues found</span>
    </div>
  );
}

function RecommendationItem({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const config = SEVERITY_CONFIG[recommendation.severity];

  return (
    <li className="rounded-md bg-muted/30 p-2">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            config.badgeClassName
          )}
        >
          {config.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{recommendation.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {recommendation.description}
          </p>
        </div>
      </div>
    </li>
  );
}

// --- Missing Components Section ---

function MissingComponentsSection({
  components,
}: {
  components: MissingComponent[];
}) {
  const [expanded, setExpanded] = React.useState(true);

  // Sort by severity: Critical → Recommended → Optional
  const sorted = [...components].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  if (sorted.length === 0) {
    return null;
  }

  return (
    <section className="mt-4" aria-labelledby="missing-heading">
      <button
        type="button"
        id="missing-heading"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={expanded}
        aria-controls="missing-content"
      >
        <span>Missing Components</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {sorted.length}
          </span>
          <ChevronIcon className="h-4 w-4" expanded={expanded} />
        </span>
      </button>

      {expanded && (
        <ul
          id="missing-content"
          className="mt-2 space-y-2"
          aria-label="Missing components"
        >
          {sorted.map((component, idx) => (
            <MissingComponentItem key={idx} component={component} />
          ))}
        </ul>
      )}
    </section>
  );
}

function MissingComponentItem({
  component,
}: {
  component: MissingComponent;
}) {
  const config = SEVERITY_CONFIG[component.severity];

  return (
    <li className="rounded-md border border-border p-2">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            config.badgeClassName
          )}
        >
          {config.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{component.type}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {component.reason}
          </p>
          <p className="mt-1 text-xs">
            <span className="text-muted-foreground">Suggested: </span>
            <span className="font-medium">{component.suggestedService}</span>
          </p>
        </div>
      </div>
    </li>
  );
}

// --- Icons ---

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

function ChevronIcon({
  className,
  expanded,
}: {
  className?: string;
  expanded: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        className,
        "transition-transform",
        expanded ? "rotate-180" : "rotate-0"
      )}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
