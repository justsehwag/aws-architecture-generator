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
 * Generates a professional AWS architecture diagram using tiered auto-layout.
 * Tier 1 (left): Edge/CDN - CloudFront, Route53, WAF
 * Tier 2: Load Balancing - ALB, NLB, API Gateway
 * Tier 3: Compute - Lambda, ECS, Fargate, EC2
 * Tier 4: Data - RDS, Aurora, DynamoDB, S3, ElastiCache
 * Tier 5 (bottom): Security/Monitoring - IAM, CloudWatch, KMS
 */
function generateDrawioXmlFromSpec(spec: { services?: Array<{ id: string; label: string; type: string; groupId?: string }>; connections?: Array<{ id: string; sourceId: string; targetId: string; label?: string }>; groups?: Array<{ id: string; label: string; type: string; children?: string[] }> }): string {
  const services = spec.services || [];
  const connections = spec.connections || [];

  // Tier assignment
  const tierMap: Record<string, number> = {
    'route53': 0, cloudfront: 0, waf: 0,
    alb: 1, nlb: 1, elb: 1, 'api-gateway': 1, cognito: 1,
    lambda: 2, ecs: 2, eks: 2, fargate: 2, ec2: 2, 'app-runner': 2, 'step-functions': 2,
    rds: 3, aurora: 3, dynamodb: 3, s3: 3, elasticache: 3, redshift: 3, opensearch: 3,
    iam: 4, kms: 4, cloudwatch: 4, cloudtrail: 4, 'secrets-manager': 4, vpc: 4, 'nat-gateway': 4,
    sqs: 2, sns: 2, eventbridge: 2, kinesis: 3, sagemaker: 3, bedrock: 2, ecr: 4,
  };

  // Category colors for fillColor
  const colorMap: Record<string, string> = {
    'route53': '#8C4FFF', cloudfront: '#8C4FFF', waf: '#DD344C',
    alb: '#8C4FFF', nlb: '#8C4FFF', elb: '#8C4FFF', 'api-gateway': '#E7157B', cognito: '#DD344C',
    lambda: '#ED7100', ecs: '#ED7100', eks: '#ED7100', fargate: '#ED7100', ec2: '#ED7100', 'app-runner': '#ED7100', 'step-functions': '#E7157B',
    rds: '#C925D1', aurora: '#C925D1', dynamodb: '#C925D1', s3: '#3F8624', elasticache: '#C925D1', redshift: '#C925D1', opensearch: '#8C4FFF',
    iam: '#DD344C', kms: '#DD344C', cloudwatch: '#E7157B', cloudtrail: '#E7157B', 'secrets-manager': '#DD344C', vpc: '#8C4FFF', 'nat-gateway': '#8C4FFF',
    sqs: '#E7157B', sns: '#E7157B', eventbridge: '#E7157B', kinesis: '#8C4FFF', sagemaker: '#01A88D', bedrock: '#01A88D', ecr: '#ED7100',
  };

  const iconMap: Record<string, string> = {
    'api-gateway': 'api_gateway', 'nat-gateway': 'vpc_nat_gateway', 'route53': 'route_53',
    'step-functions': 'step_functions', 'elastic-beanstalk': 'elastic_beanstalk',
    'secrets-manager': 'secrets_manager', 'certificate-manager': 'certificate_manager',
    'app-runner': 'app_runner', 'alb': 'application_load_balancer',
    'nlb': 'network_load_balancer', 'elb': 'elastic_load_balancing',
    'guardduty': 'guardduty', 'shield': 'shield', 'ecr': 'ecr',
    'security-hub': 'security_hub', 'inspector': 'inspector',
  };

  // Sort services into tiers
  const tiers: Array<typeof services> = [[], [], [], [], []];
  services.forEach(svc => {
    const tier = tierMap[svc.type] ?? 2;
    tiers[tier].push(svc);
  });

  // Layout: each tier is a column, services spread vertically within
  const tierX = [60, 280, 520, 780, 520]; // x position per tier (wider spacing)
  const startY = 80;
  const spacingY = 130; // more vertical spacing

  let cells = '<mxCell id="0"/><mxCell id="1" parent="0"/>';

  // Place services
  const positions: Record<string, { x: number; y: number }> = {};
  tiers.forEach((tierServices, tierIdx) => {
    if (tierIdx === 4) {
      // Security/monitoring tier: spread horizontally below main flow
      const secY = startY + Math.max(tiers[0].length, tiers[1].length, tiers[2].length, tiers[3].length) * spacingY + 60;
      tierServices.forEach((svc, i) => {
        const x = 60 + i * 180;
        const y = secY;
        positions[svc.id] = { x, y };
        const fill = colorMap[svc.type] || '#232F3E';
        const resIcon = iconMap[svc.type] || svc.type.replace(/-/g, '_');
        const label = svc.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        cells += `<mxCell id="${svc.id}" value="${label}" style="outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=${fill};strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=11;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.${resIcon}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="60" height="60" as="geometry"/></mxCell>`;
      });
    } else {
      tierServices.forEach((svc, i) => {
        const x = tierX[tierIdx];
        const y = startY + i * spacingY;
        positions[svc.id] = { x, y };
        const fill = colorMap[svc.type] || '#232F3E';
        const resIcon = iconMap[svc.type] || svc.type.replace(/-/g, '_');
        const label = svc.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        cells += `<mxCell id="${svc.id}" value="${label}" style="outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=${fill};strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=11;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.${resIcon}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="60" height="60" as="geometry"/></mxCell>`;
      });
    }
  });

  // Place connections with proper edge styles
  connections.forEach((conn) => {
    const label = (conn.label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    cells += `<mxCell id="${conn.id}" value="${label}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#333333;strokeWidth=1.5;fontSize=9;fontColor=#666666;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" source="${conn.sourceId}" target="${conn.targetId}" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`;
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
          // Also save to localStorage as draft
          try {
            const drafts = JSON.parse(localStorage.getItem('diagram_drafts') || '[]');
            const exists = drafts.some((d: { diagramId: string }) => d.diagramId === cachedData.diagramId);
            if (!exists) {
              drafts.unshift({ diagramId: cachedData.diagramId, name: spec?.name || 'Untitled', createdAt: new Date().toISOString(), spec });
              if (drafts.length > 20) drafts.pop();
              localStorage.setItem('diagram_drafts', JSON.stringify(drafts));
            }
          } catch { /* ignore */ }
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

  // --- Warn before leaving + auto-save draft to localStorage ---
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (diagramData && xmlRef.current) {
        // Auto-save draft to localStorage
        try {
          const drafts = JSON.parse(localStorage.getItem('diagram_drafts') || '[]');
          const idx = drafts.findIndex((d: { diagramId: string }) => d.diagramId === diagramData.diagramId);
          const draft = { diagramId: diagramData.diagramId, name: diagramData.name, createdAt: new Date().toISOString(), xml: xmlRef.current };
          if (idx >= 0) drafts[idx] = draft; else drafts.unshift(draft);
          if (drafts.length > 20) drafts.pop();
          localStorage.setItem('diagram_drafts', JSON.stringify(drafts));
        } catch { /* ignore */ }
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [diagramData]);

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
              architectureSpec={(() => { try { const c = sessionStorage.getItem(`diagram_${diagramId}`); return c ? JSON.parse(c).architectureSpec : null; } catch { return null; } })()}
              onArchitectureUpdate={(_spec, xml) => {
                setDiagramData(prev => prev ? { ...prev, drawioXml: xml } : prev);
                xmlRef.current = xml;
              }}
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
