"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Download,
  PanelRightClose,
  PanelRightOpen,
  History,
  BarChart3,
  Shield,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagramProvider } from "@/components/diagram/DiagramContext";
import { DiagramCanvas } from "@/components/diagram/DiagramCanvas";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { CostPanel } from "@/components/cost/CostPanel";
import { ExplanationPanel } from "@/components/explanation/ExplanationPanel";
import { ExportDialog } from "@/components/export/ExportDialog";
import { VersionHistory } from "@/components/version/VersionHistory";
import { useAutosave } from "@/hooks/useAutosave";
import { cn } from "@/lib/utils";

// --- Types ---

type RightPanelTab = "analysis" | "cost" | "explanation" | "versions";

interface DiagramData {
  diagramId: string;
  name: string;
  drawioXml: string;
}

/**
 * Generates a basic Draw.io XML diagram from an ArchitectureSpec.
 * Uses colored nodes grouped by service category (matching AWS color palette).
 * Places services in a grid layout with orthogonal edge connections.
 */
function generateDrawioXmlFromSpec(spec: { services?: Array<{ id: string; label: string; type: string; groupId?: string }>; connections?: Array<{ id: string; sourceId: string; targetId: string; label?: string }>; groups?: Array<{ id: string; label: string; type: string; children?: string[] }> }): string {
  const services = spec.services || [];
  const connections = spec.connections || [];
  const cols = Math.max(3, Math.ceil(Math.sqrt(services.length)));

  // AWS category colors
  const categoryColors: Record<string, { fill: string; stroke: string }> = {
    compute: { fill: '#ED7100', stroke: '#C25400' },
    storage: { fill: '#3F8624', stroke: '#2D6A1B' },
    database: { fill: '#2E27AD', stroke: '#1F1B80' },
    networking: { fill: '#8C4FFF', stroke: '#6B3ACC' },
    security: { fill: '#DD344C', stroke: '#B22A3D' },
    integration: { fill: '#E7157B', stroke: '#B8115F' },
    analytics: { fill: '#8C4FFF', stroke: '#6B3ACC' },
    ml: { fill: '#01A88D', stroke: '#01856E' },
    management: { fill: '#E7157B', stroke: '#B8115F' },
    general: { fill: '#232F3E', stroke: '#1A2330' },
  };

  // Service type to category mapping
  const serviceCategory: Record<string, string> = {
    ec2: 'compute', lambda: 'compute', ecs: 'compute', eks: 'compute', fargate: 'compute',
    s3: 'storage', ebs: 'storage', efs: 'storage',
    rds: 'database', aurora: 'database', dynamodb: 'database', elasticache: 'database', redshift: 'database',
    vpc: 'networking', cloudfront: 'networking', 'route53': 'networking', alb: 'networking', nlb: 'networking', elb: 'networking', 'api-gateway': 'networking', 'nat-gateway': 'networking',
    iam: 'security', cognito: 'security', waf: 'security', kms: 'security', 'secrets-manager': 'security',
    sqs: 'integration', sns: 'integration', eventbridge: 'integration', 'step-functions': 'integration',
    kinesis: 'analytics', athena: 'analytics', glue: 'analytics', opensearch: 'analytics',
    sagemaker: 'ml', bedrock: 'ml',
    cloudwatch: 'management', cloudtrail: 'management',
  };

  let cells = '<mxCell id="0"/><mxCell id="1" parent="0"/>';
  
  services.forEach((svc, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 80 + col * 200;
    const y = 80 + row * 140;
    const cat = serviceCategory[svc.type] || 'general';
    const colors = categoryColors[cat] || categoryColors.general;
    const escapedLabel = svc.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    cells += `<mxCell id="${svc.id}" value="${escapedLabel}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${colors.fill};fontColor=#ffffff;strokeColor=${colors.stroke};fontSize=11;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="150" height="60" as="geometry"/></mxCell>`;
  });

  connections.forEach((conn) => {
    const escapedLabel = (conn.label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    cells += `<mxCell id="${conn.id}" value="${escapedLabel}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;html=1;strokeColor=#232F3E;fontSize=10;" edge="1" source="${conn.sourceId}" target="${conn.targetId}" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?><mxfile><diagram name="Architecture"><mxGraphModel><root>${cells}</root></mxGraphModel></diagram></mxfile>`;
}

// --- Component ---

/**
 * Diagram Viewer page.
 *
 * Full-height layout with:
 * - DiagramCanvas (left, takes most width)
 * - Collapsible right panel with tabs: Analysis, Cost, Explanation, Versions
 * - Export button in toolbar triggers ExportDialog
 * - Autosave integration via useAutosave hook
 * - Redirects to dashboard if diagram ID is invalid (Requirement 11.8)
 *
 * Validates: Requirements 11.3, 11.8
 */
export default function DiagramViewerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const diagramId = params.id;

  // --- State ---
  const [diagramData, setDiagramData] = React.useState<DiagramData | null>(null);
  const [cachedExplanation, setCachedExplanation] = React.useState<unknown>(null);
  const [isFromCache, setIsFromCache] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<RightPanelTab>("analysis");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);

  // Track current XML for autosave
  const xmlRef = React.useRef<string>("");

  // --- Fetch diagram data ---
  React.useEffect(() => {
    if (!diagramId) {
      router.replace("/");
      return;
    }

    async function fetchDiagram() {
      setIsLoading(true);
      setError(null);

      try {
        // Check sessionStorage first (data from generation)
        const cached = sessionStorage.getItem(`diagram_${diagramId}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          const spec = cachedData.architectureSpec;
          
          // Generate basic drawio XML from architecture spec if no XML present
          let xml = cachedData.drawioXml || "";
          if (!xml && spec?.services) {
            xml = generateDrawioXmlFromSpec(spec);
          }
          
          setDiagramData({
            diagramId: cachedData.diagramId ?? diagramId,
            name: spec?.name ?? "Generated Diagram",
            drawioXml: xml,
          });
          xmlRef.current = xml;
          if (cachedData.explanation) {
            setCachedExplanation(cachedData.explanation);
          }
          setIsFromCache(true);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/diagrams/${diagramId}`);
        if (!response.ok) {
          if (response.status === 404) {
            // Diagram not found — redirect to dashboard (Requirement 11.8)
            router.replace("/");
            return;
          }
          throw new Error(`Failed to load diagram (${response.status})`);
        }

        const data = await response.json();
        setDiagramData({
          diagramId: data.diagramId ?? diagramId,
          name: data.name ?? "Untitled Diagram",
          drawioXml: data.drawioXml ?? "",
        });
        xmlRef.current = data.drawioXml ?? "";
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load diagram";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDiagram();
  }, [diagramId, router]);

  // --- Autosave integration (Requirement 10.1) --- disabled for cached diagrams
  const { status: autosaveStatus, lastSavedAt, showWarning } = useAutosave({
    diagramId: diagramData?.diagramId ?? null,
    getContent: () => xmlRef.current || null,
    enabled: !!diagramData && !isFromCache,
  });

  // --- Version restore handler ---
  const handleVersionRestore = React.useCallback(() => {
    // Re-fetch diagram data after restore
    if (!diagramId) return;
    fetch(`/api/diagrams/${diagramId}`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) {
          setDiagramData({
            diagramId: data.diagramId ?? diagramId,
            name: data.name ?? "Untitled Diagram",
            drawioXml: data.drawioXml ?? "",
          });
          xmlRef.current = data.drawioXml ?? "";
        }
      })
      .catch(() => {
        // Silent catch — user can refresh manually
      });
  }, [diagramId]);

  // --- Tab configuration ---
  const tabs: { id: RightPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: "analysis", label: "Analysis", icon: <Shield className="h-4 w-4" aria-hidden="true" /> },
    { id: "cost", label: "Cost", icon: <BarChart3 className="h-4 w-4" aria-hidden="true" /> },
    { id: "explanation", label: "Explanation", icon: <BookOpen className="h-4 w-4" aria-hidden="true" /> },
    { id: "versions", label: "Versions", icon: <History className="h-4 w-4" aria-hidden="true" /> },
  ];

  // --- Loading state ---
  if (isLoading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          <SpinnerIcon className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading diagram...</p>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertIcon className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Failed to Load Diagram
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to Dashboard
            </Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  // --- No diagram data ---
  if (!diagramData) {
    return null;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top toolbar */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {diagramData.name}
          </h1>
          {/* Autosave status indicator */}
          <AutosaveIndicator
            status={autosaveStatus}
            lastSavedAt={lastSavedAt}
            showWarning={showWarning}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Export button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            aria-label="Export diagram"
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export
          </Button>

          {/* Toggle right panel */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            aria-label={rightPanelOpen ? "Close side panel" : "Open side panel"}
            aria-expanded={rightPanelOpen}
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Diagram canvas — takes remaining width */}
        <main className="flex-1 overflow-hidden">
          <DiagramProvider initialXml={diagramData.drawioXml}>
            <DiagramCanvas className="h-full w-full" />
          </DiagramProvider>
        </main>

        {/* Right side panel */}
        {rightPanelOpen && (
          <aside
            className="flex w-80 flex-shrink-0 flex-col border-l border-border bg-background lg:w-96"
            aria-label="Side panel"
          >
            {/* Tab navigation */}
            <nav
              className="flex border-b border-border"
              role="tablist"
              aria-label="Panel tabs"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`panel-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Tab panels */}
            <div className="flex-1 overflow-y-auto">
              <div
                role="tabpanel"
                id="panel-tabpanel-analysis"
                aria-labelledby="panel-tab-analysis"
                hidden={activeTab !== "analysis"}
                className="h-full"
              >
                {activeTab === "analysis" && !isFromCache && (
                  <AnalysisPanel
                    diagramId={diagramData.diagramId}
                    className="border-l-0"
                  />
                )}
                {activeTab === "analysis" && isFromCache && (
                  <div className="p-4 text-sm text-muted-foreground">
                    <h3 className="font-semibold text-foreground mb-2">Architecture Analysis</h3>
                    <p>Analysis is computed from the generated architecture. Save the diagram to enable full Well-Architected analysis.</p>
                  </div>
                )}
              </div>

              <div
                role="tabpanel"
                id="panel-tabpanel-cost"
                aria-labelledby="panel-tab-cost"
                hidden={activeTab !== "cost"}
                className="h-full p-4"
              >
                {activeTab === "cost" && !isFromCache && (
                  <CostPanel diagramId={diagramData.diagramId} />
                )}
                {activeTab === "cost" && isFromCache && (
                  <div className="text-sm text-muted-foreground">
                    <h3 className="font-semibold text-foreground mb-2">Cost Estimation</h3>
                    <p>Save the diagram to enable cost estimation.</p>
                  </div>
                )}
              </div>

              <div
                role="tabpanel"
                id="panel-tabpanel-explanation"
                aria-labelledby="panel-tab-explanation"
                hidden={activeTab !== "explanation"}
                className="h-full"
              >
                {activeTab === "explanation" && (
                  <ExplanationPanel
                    diagramId={diagramData.diagramId}
                    explanation={cachedExplanation as never}
                    className="border-l-0"
                  />
                )}
              </div>

              <div
                role="tabpanel"
                id="panel-tabpanel-versions"
                aria-labelledby="panel-tab-versions"
                hidden={activeTab !== "versions"}
                className="h-full p-4"
              >
                {activeTab === "versions" && !isFromCache && (
                  <VersionHistory
                    diagramId={diagramData.diagramId}
                    onRestoreSuccess={handleVersionRestore}
                  />
                )}
                {activeTab === "versions" && isFromCache && (
                  <div className="text-sm text-muted-foreground">
                    <h3 className="font-semibold text-foreground mb-2">Version History</h3>
                    <p>Save the diagram to enable version history.</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Export dialog */}
      <ExportDialog
        diagramId={diagramData.diagramId}
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </div>
  );
}

// --- Autosave indicator sub-component ---

function AutosaveIndicator({
  status,
  lastSavedAt,
  showWarning,
}: {
  status: string;
  lastSavedAt: string | null;
  showWarning: boolean;
}) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
        <SpinnerIcon className="h-3 w-3 animate-spin" />
        Saving...
      </span>
    );
  }

  if (showWarning || status === "error") {
    return (
      <span
        className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
        role="alert"
        aria-live="assertive"
      >
        <AlertIcon className="h-3 w-3" />
        Autosave failed
      </span>
    );
  }

  if (status === "saved" && lastSavedAt) {
    return (
      <span className="text-xs text-muted-foreground" aria-live="polite">
        Saved
      </span>
    );
  }

  return null;
}

// --- Inline SVG Icons ---

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
