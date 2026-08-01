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
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagramProvider } from "@/components/diagram/DiagramContext";
import { DrawioEmbed } from "@/components/diagram/DrawioEmbed";
import { DiagramChat } from "@/components/diagram/DiagramChat";
import { ExplanationPanel } from "@/components/explanation/ExplanationPanel";
import { ExportDialog } from "@/components/export/ExportDialog";
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
    database: { fill: '#C925D1', stroke: '#9B1EA8' },
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
    // Map service types to correct Draw.io resIcon names
    const iconMap: Record<string, string> = {
      'api-gateway': 'api_gateway', 'nat-gateway': 'vpc_nat_gateway', 'route53': 'route_53',
      'step-functions': 'step_functions', 'elastic-beanstalk': 'elastic_beanstalk',
      'secrets-manager': 'secrets_manager', 'certificate-manager': 'certificate_manager',
      'security-group': 'security_group', 'app-runner': 'app_runner',
    };
    const resIcon = iconMap[svc.type] || svc.type.replace(/-/g, '_');
    cells += `<mxCell id="${svc.id}" value="${escapedLabel}" style="outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=${colors.fill};strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=11;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.${resIcon}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="48" height="48" as="geometry"/></mxCell>`;
  });

  connections.forEach((conn) => {
    const escapedLabel = (conn.label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    cells += `<mxCell id="${conn.id}" value="${escapedLabel}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;html=1;strokeColor=#FFFFFF;fontSize=10;fontColor=#FFFFFF;labelBackgroundColor=none;" edge="1" source="${conn.sourceId}" target="${conn.targetId}" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`;
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
  const [chatOpen, setChatOpen] = React.useState(true);
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

  // --- Autosave integration (Requirement 10.1)
  const { status: autosaveStatus, lastSavedAt, showWarning } = useAutosave({
    diagramId: diagramData?.diagramId ?? null,
    getContent: () => xmlRef.current || null,
    enabled: !!diagramData,
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

  // (Tabs removed — chatbot replaces side panels)

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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top toolbar — minimal */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/create")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="truncate text-sm font-semibold text-foreground">
            {diagramData.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} aria-label="Export diagram">
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            aria-label={chatOpen ? "Close chat" : "Open chat"}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Diagram canvas — takes remaining width */}
        <main className="flex-1 overflow-hidden">
          {diagramData.drawioXml ? (
            <DrawioEmbed
              xml={diagramData.drawioXml}
              className="h-full w-full"
              onXmlChange={(newXml) => { xmlRef.current = newXml; }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No diagram content</p>
            </div>
          )}
        </main>

        {/* Chat panel */}
        {chatOpen && (
          <aside className="w-80 flex-shrink-0 lg:w-96">
            <DiagramChat
              diagramXml={diagramData.drawioXml}
              className="h-full"
            />
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
