"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  LayoutDashboard,
  FileText,
  Zap,
  Clock,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import {
  softDeleteDiagram,
  restoreDiagram,
  permanentlyDeleteDiagram,
  purgeExpiredDiagrams,
  getDeletedDiagrams,
  getDaysUntilExpiry,
  type DeletedDiagram,
} from "@/utils/deleted-diagrams";



/**
 * Formats a date string into a human-readable relative time.
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Dashboard page (root route).
 *
 * Displays:
 * - Welcome greeting
 * - Recent Diagrams (up to 10 most-recently-modified)
 * - Quick Start Templates (top 4 built-in templates)
 * - Usage Statistics (total diagrams, total generations)
 * - Create New Diagram CTA
 * - Empty state for new users
 *
 * Validates: Requirements 11.1, 11.8
 */
export default function DashboardPage() {
  const { recentDiagrams, stats, isLoading, error, refresh } = useDashboard();
  const [deletedDiagrams, setDeletedDiagrams] = React.useState<DeletedDiagram[]>([]);
  const [deletedOpen, setDeletedOpen] = React.useState(false);

  // Purge expired and load deleted diagrams on mount
  React.useEffect(() => {
    purgeExpiredDiagrams();
    setDeletedDiagrams(getDeletedDiagrams());
  }, []);

  const handleSoftDelete = (diagramId: string) => {
    softDeleteDiagram(diagramId);
    // Also remove from sessionStorage
    try { sessionStorage.removeItem(`diagram_${diagramId}`); } catch {}
    // Force refresh the dashboard data
    setDeletedDiagrams(getDeletedDiagrams());
    refresh();
  };

  const handleRestore = (diagramId: string) => {
    restoreDiagram(diagramId);
    setDeletedDiagrams(getDeletedDiagrams());
    refresh();
  };

  const handlePermanentDelete = (diagramId: string) => {
    permanentlyDeleteDiagram(diagramId);
    setDeletedDiagrams(getDeletedDiagrams());
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header with greeting and CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-muted-foreground">
            Convert natural language descriptions into professional AWS
            architecture diagrams.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Create a new diagram"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create New Diagram
        </Link>
      </div>

      {/* Statistics Section */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Usage Statistics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            label="Total Diagrams"
            value={isLoading ? "—" : stats.totalDiagrams.toString()}
          />
          <StatCard
            icon={<Zap className="h-5 w-5" aria-hidden="true" />}
            label="Total Generations"
            value={isLoading ? "—" : stats.totalGenerations.toString()}
          />
        </div>
      </section>

      {/* Recent Diagrams Section */}
      <section aria-labelledby="recent-heading">
        <div className="flex items-center justify-between">
          <h2
            id="recent-heading"
            className="text-xl font-semibold text-foreground"
          >
            Recent Diagrams
          </h2>
          {recentDiagrams.length > 0 && (
            <Link
              href="/diagrams"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-lg border border-border bg-muted/50 animate-[pulse_2s_ease-in-out_infinite]"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={refresh}
              className="mt-2 text-sm font-medium text-destructive underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        ) : recentDiagrams.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentDiagrams.map((diagram) => (
              <div
                key={diagram.diagramId}
                className="group relative rounded-lg border border-border bg-card p-4 transition-colors duration-150 hover:border-primary/50 hover:shadow-md"
              >
                <Link
                  href={`/diagram/${diagram.diagramId}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-card-foreground group-hover:text-primary">
                        {diagram.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <span>{formatRelativeTime(diagram.updatedAt)}</span>
                      </div>
                    </div>
                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {diagram.serviceCount}{" "}
                      {diagram.serviceCount === 1 ? "service" : "services"}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSoftDelete(diagram.diagramId);
                  }}
                  className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${diagram.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Deleted Diagrams Section */}
      {deletedDiagrams.length > 0 && (
        <section aria-labelledby="deleted-heading">
          <button
            onClick={() => setDeletedOpen(!deletedOpen)}
            className="flex items-center gap-2 text-xl font-semibold text-foreground hover:text-primary transition-colors"
            aria-expanded={deletedOpen}
            aria-controls="deleted-list"
          >
            {deletedOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
            <h2 id="deleted-heading">Deleted ({deletedDiagrams.length})</h2>
          </button>

          {deletedOpen && (
            <div id="deleted-list" className="mt-4 space-y-2">
              {deletedDiagrams.map((diagram) => {
                const daysLeft = getDaysUntilExpiry(diagram);
                return (
                  <div
                    key={diagram.diagramId}
                    className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-muted-foreground">
                        {diagram.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Deleted {new Date(diagram.deletedAt).toLocaleDateString()} · Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => handleRestore(diagram.diagramId)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        aria-label={`Restore ${diagram.name}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(diagram.diagramId)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Permanently delete ${diagram.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}


    </div>
  );
}

/**
 * Statistics card component for the dashboard.
 */
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-card-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state shown when the user has no diagrams yet.
 */
function EmptyState() {
  return (
    <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
      <LayoutDashboard
        className="h-12 w-12 text-muted-foreground/50"
        aria-hidden="true"
      />
      <h3 className="mt-4 text-sm font-medium text-foreground">
        No diagrams yet
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Get started by creating your first architecture diagram from a natural
        language description.
      </p>
      <Link
        href="/create"
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create Your First Diagram
      </Link>
    </div>
  );
}
