/**
 * ComparisonView Component
 *
 * Displays two architecture diagrams side-by-side with visual diff indicators.
 * - Left panel: Version A with removed nodes highlighted in red
 * - Right panel: Version B with added nodes highlighted in green
 * - Modified nodes highlighted in amber/yellow in both panels
 * - Legend explaining the color coding
 * - Disabled state when fewer than 2 versions are available
 *
 * Validates: Requirements 17.1, 17.7
 */

'use client';

import React from 'react';
import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';
import type { DiagramDiffResult } from '@/lib/comparison/diagram-diff';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComparisonViewProps {
  /** Architecture spec for version A (left panel) */
  specA: ArchitectureSpec | null;
  /** Architecture spec for version B (right panel) */
  specB: ArchitectureSpec | null;
  /** Diff result between the two specs */
  diff: DiagramDiffResult | null;
  /** Whether comparison is currently loading */
  isLoading?: boolean;
  /** Whether comparison is disabled (fewer than 2 versions) */
  isDisabled?: boolean;
  /** Number of versions available */
  availableVersionCount?: number;
}

// ─── Highlight Classes ────────────────────────────────────────────────────────

const HIGHLIGHT_CLASSES = {
  added: 'border-green-500 bg-green-50 dark:bg-green-950/30',
  removed: 'border-red-500 bg-red-50 dark:bg-red-950/30',
  modified: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30',
  unchanged: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
} as const;

const BADGE_CLASSES = {
  added: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  removed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  modified:
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
} as const;

// ─── Sub-Components ───────────────────────────────────────────────────────────

function DiffLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
      aria-label="Comparison legend"
    >
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
        Legend:
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded border-2 border-green-500 bg-green-50 dark:bg-green-950/30" />
        <span className="text-sm text-gray-600 dark:text-gray-300">Added</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded border-2 border-red-500 bg-red-50 dark:bg-red-950/30" />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Removed
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30" />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Modified
        </span>
      </span>
    </div>
  );
}

function ServiceNodeCard({
  service,
  highlight,
}: {
  service: ServiceNode;
  highlight: 'added' | 'removed' | 'modified' | 'unchanged';
}) {
  return (
    <div
      className={`rounded-lg border-2 p-3 transition-colors ${HIGHLIGHT_CLASSES[highlight]}`}
      data-testid={`service-node-${service.id}`}
      data-highlight={highlight}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {service.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {service.type}
          </p>
        </div>
        {highlight !== 'unchanged' && (
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES[highlight]}`}
          >
            {highlight}
          </span>
        )}
      </div>
      {Object.keys(service.properties).length > 0 && (
        <div className="mt-2 space-y-0.5">
          {Object.entries(service.properties)
            .slice(0, 3)
            .map(([key, value]) => (
              <p
                key={key}
                className="truncate text-xs text-gray-400 dark:text-gray-500"
              >
                {key}: {value}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

function DiagramPanel({
  title,
  spec,
  highlightedIds,
  side,
}: {
  title: string;
  spec: ArchitectureSpec;
  highlightedIds: Map<string, 'added' | 'removed' | 'modified'>;
  side: 'left' | 'right';
}) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col rounded-lg border border-gray-200 dark:border-gray-700"
      data-testid={`comparison-panel-${side}`}
    >
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {spec.name} &middot; {spec.services.length} services
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {spec.services.map((service) => (
            <ServiceNodeCard
              key={service.id}
              service={service}
              highlight={highlightedIds.get(service.id) ?? 'unchanged'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DiffSummary({ diff }: { diff: DiagramDiffResult }) {
  const total = diff.added.length + diff.removed.length + diff.modified.length;
  if (total === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No structural differences found between these versions.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-gray-600 dark:text-gray-300">
        {total} change{total !== 1 ? 's' : ''} detected:
      </span>
      {diff.added.length > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES.added}`}>
          +{diff.added.length} added
        </span>
      )}
      {diff.removed.length > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES.removed}`}>
          -{diff.removed.length} removed
        </span>
      )}
      {diff.modified.length > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES.modified}`}>
          ~{diff.modified.length} modified
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ComparisonView({
  specA,
  specB,
  diff,
  isLoading = false,
  isDisabled = false,
  availableVersionCount = 0,
}: ComparisonViewProps) {
  // Disabled state: fewer than 2 versions available
  if (isDisabled) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 dark:border-gray-600 dark:bg-gray-900"
        data-testid="comparison-disabled"
        role="status"
        aria-label="Comparison unavailable"
      >
        <svg
          className="mb-3 h-10 w-10 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-300">
          Architecture comparison is not available
        </p>
        <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
          Two versions are required to compare architectures.
          {availableVersionCount === 1 && ' You currently have 1 version.'}
          {availableVersionCount === 0 && ' No versions are available yet.'}
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-12 dark:border-gray-700 dark:bg-gray-900"
        data-testid="comparison-loading"
        role="status"
        aria-label="Loading comparison"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Comparing architecture versions…
          </p>
        </div>
      </div>
    );
  }

  // No data yet (idle state)
  if (!specA || !specB || !diff) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-12 dark:border-gray-700 dark:bg-gray-900"
        data-testid="comparison-idle"
        role="status"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select two versions to compare their architectures.
        </p>
      </div>
    );
  }

  // Build highlight maps for each panel
  const leftHighlights = new Map<
    string,
    'added' | 'removed' | 'modified'
  >();
  const rightHighlights = new Map<
    string,
    'added' | 'removed' | 'modified'
  >();

  for (const service of diff.removed) {
    leftHighlights.set(service.id, 'removed');
  }
  for (const service of diff.added) {
    rightHighlights.set(service.id, 'added');
  }
  for (const { before, after } of diff.modified) {
    leftHighlights.set(before.id, 'modified');
    rightHighlights.set(after.id, 'modified');
  }

  return (
    <div
      className="flex flex-col gap-4"
      data-testid="comparison-view"
      aria-label="Architecture comparison view"
    >
      {/* Legend and summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DiffLegend />
        <DiffSummary diff={diff} />
      </div>

      {/* Side-by-side panels */}
      <div className="flex min-h-[400px] gap-4">
        <DiagramPanel
          title="Version A (Before)"
          spec={specA}
          highlightedIds={leftHighlights}
          side="left"
        />
        <DiagramPanel
          title="Version B (After)"
          spec={specB}
          highlightedIds={rightHighlights}
          side="right"
        />
      </div>
    </div>
  );
}
