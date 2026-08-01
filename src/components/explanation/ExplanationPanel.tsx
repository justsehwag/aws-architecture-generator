"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useExplanation } from "@/hooks/useExplanation";
import type { ArchitectureExplanation, ServiceDescription } from "@/types/api";

// --- Tab definitions ---

type TabId = "overview" | "services" | "best-practices";

interface TabItem {
  id: TabId;
  label: string;
}

const TABS: TabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "services", label: "Services" },
  { id: "best-practices", label: "Best Practices" },
];

// --- Component Props ---

export interface ExplanationPanelProps {
  /** The diagram ID to fetch explanation for */
  diagramId: string;
  /** Optional pre-loaded explanation data (avoids refetch if already available) */
  explanation?: ArchitectureExplanation | null;
  /** Additional CSS class names */
  className?: string;
}

/**
 * ExplanationPanel displays a plain-language explanation of the architecture
 * including a summary, services table, and best practice recommendations.
 *
 * Positioned as a dedicated panel adjacent to the diagram canvas.
 * Features tab-based navigation with expandable/collapsible sections.
 *
 * Validates: Requirements 8.5
 */
export function ExplanationPanel({
  diagramId,
  explanation: preloadedExplanation,
  className,
}: ExplanationPanelProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>("overview");
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(
    new Set()
  );

  const { state, fetchExplanation } = useExplanation();

  // Fetch explanation on mount if no preloaded data
  React.useEffect(() => {
    if (!preloadedExplanation && diagramId) {
      fetchExplanation(diagramId);
    }
  }, [diagramId, preloadedExplanation, fetchExplanation]);

  const explanationData = preloadedExplanation ?? state.data;
  const isLoading = !preloadedExplanation && state.status === "loading";
  const error = !preloadedExplanation ? state.error : null;

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col border-l border-border bg-background",
        className
      )}
      aria-label="Architecture Explanation"
      role="complementary"
    >
      {/* Panel Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Architecture Explanation
        </h2>
      </div>

      {/* Tab Navigation */}
      <div
        className="flex flex-shrink-0 border-b border-border"
        role="tablist"
        aria-label="Explanation sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <LoadingState />}
        {error && <ErrorState error={error} onRetry={() => fetchExplanation(diagramId)} />}
        {!isLoading && !error && explanationData && (
          <>
            <div
              role="tabpanel"
              id="tabpanel-overview"
              aria-labelledby="tab-overview"
              hidden={activeTab !== "overview"}
            >
              <OverviewTab
                summary={explanationData.summary}
                collapsed={collapsedSections.has("overview-summary")}
                onToggle={() => toggleSection("overview-summary")}
              />
            </div>

            <div
              role="tabpanel"
              id="tabpanel-services"
              aria-labelledby="tab-services"
              hidden={activeTab !== "services"}
            >
              <ServicesTab
                services={explanationData.serviceDescriptions}
                collapsedSections={collapsedSections}
                onToggleSection={toggleSection}
              />
            </div>

            <div
              role="tabpanel"
              id="tabpanel-best-practices"
              aria-labelledby="tab-best-practices"
              hidden={activeTab !== "best-practices"}
            >
              <BestPracticesTab
                recommendations={explanationData.bestPractices}
                collapsed={collapsedSections.has("best-practices-list")}
                onToggle={() => toggleSection("best-practices-list")}
              />
            </div>
          </>
        )}
        {!isLoading && !error && !explanationData && <EmptyState />}
      </div>
    </aside>
  );
}

// --- Sub-components ---

function LoadingState() {
  return (
    <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-2">
        <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading explanation...</p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div
      className="p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
        <p className="text-sm font-medium text-destructive">
          Failed to Load Explanation
        </p>
        <p className="mt-1 text-xs text-destructive/90">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium",
            "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          aria-label="Retry loading explanation"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">
        No explanation available. Generate a diagram to see its architecture explanation.
      </p>
    </div>
  );
}

// --- Overview Tab ---

interface OverviewTabProps {
  summary: string;
  collapsed: boolean;
  onToggle: () => void;
}

function OverviewTab({ summary, collapsed, onToggle }: OverviewTabProps) {
  return (
    <div className="p-4">
      <CollapsibleSection
        title="Summary"
        sectionId="overview-summary"
        collapsed={collapsed}
        onToggle={onToggle}
      >
        <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
      </CollapsibleSection>
    </div>
  );
}

// --- Services Tab ---

interface ServicesTabProps {
  services: ServiceDescription[];
  collapsedSections: Set<string>;
  onToggleSection: (id: string) => void;
}

function ServicesTab({ services, collapsedSections, onToggleSection }: ServicesTabProps) {
  if (services.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">No services found in this architecture.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <CollapsibleSection
        title={`Services (${services.length})`}
        sectionId="services-table"
        collapsed={collapsedSections.has("services-table")}
        onToggle={() => onToggleSection("services-table")}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Architecture services summary">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 pr-3 text-left text-xs font-semibold text-muted-foreground">
                  Service Name
                </th>
                <th className="pb-2 pr-3 text-left text-xs font-semibold text-muted-foreground">
                  Purpose
                </th>
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">
                  Connections
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, index) => (
                <tr
                  key={`${service.serviceName}-${index}`}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2 pr-3 align-top font-medium text-foreground">
                    {service.serviceName}
                  </td>
                  <td className="py-2 pr-3 align-top text-foreground/80">
                    {service.purpose}
                  </td>
                  <td className="py-2 align-top text-foreground/80">
                    {service.connections.length > 0
                      ? service.connections.join(", ")
                      : <span className="text-muted-foreground italic">None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// --- Best Practices Tab ---

interface BestPracticesTabProps {
  recommendations: string[];
  collapsed: boolean;
  onToggle: () => void;
}

function BestPracticesTab({ recommendations, collapsed, onToggle }: BestPracticesTabProps) {
  if (recommendations.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          No best practice recommendations available for this architecture.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <CollapsibleSection
        title={`Recommendations (${recommendations.length})`}
        sectionId="best-practices-list"
        collapsed={collapsed}
        onToggle={onToggle}
      >
        <ol className="list-decimal space-y-2 pl-5" aria-label="Best practice recommendations">
          {recommendations.map((recommendation, index) => (
            <li
              key={index}
              className="text-sm leading-relaxed text-foreground/90"
            >
              {recommendation}
            </li>
          ))}
        </ol>
      </CollapsibleSection>
    </div>
  );
}

// --- Collapsible Section ---

interface CollapsibleSectionProps {
  title: string;
  sectionId: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  sectionId,
  collapsed,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2 text-left",
          "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          "transition-colors"
        )}
        aria-expanded={!collapsed}
        aria-controls={`section-content-${sectionId}`}
      >
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <ChevronIcon
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            collapsed ? "" : "rotate-180"
          )}
        />
      </button>
      <div
        id={`section-content-${sectionId}`}
        role="region"
        aria-labelledby={`section-header-${sectionId}`}
        className={cn(
          "overflow-hidden transition-all",
          collapsed ? "h-0" : "h-auto"
        )}
      >
        {!collapsed && <div className="px-3 pb-3 pt-1">{children}</div>}
      </div>
    </div>
  );
}

// --- Icons ---

function ChevronIcon({ className }: { className?: string }) {
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
      <polyline points="6 9 12 15 18 9" />
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
