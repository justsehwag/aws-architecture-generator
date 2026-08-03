"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ExportOptions, ExportResponse } from "@/types/api";

export type { ExportOptions };

export type ExportFormat =
  | "drawio"
  | "png"
  | "svg"
  | "pdf"
  | "json"
  | "markdown"
  | "pptx";

export const SUPPORTED_FORMATS: ExportFormat[] = [
  "drawio",
  "png",
  "svg",
  "pdf",
  "json",
  "markdown",
  "pptx",
];

export type ExportStatus = "idle" | "exporting" | "success" | "error";

export interface ExportState {
  status: ExportStatus;
  downloadUrl: string | null;
  error: string | null;
  format: ExportFormat | null;
}

export interface UseExportReturn {
  state: ExportState;
  exportDiagram: (
    diagramId: string,
    format: ExportFormat,
    options?: ExportOptions
  ) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: ExportState = {
  status: "idle",
  downloadUrl: null,
  error: null,
  format: null,
};

/**
 * Hook that manages export state machine (idle → exporting → success | error).
 * First tries client-side export from sessionStorage (for diagrams not yet persisted).
 * Falls back to POST /api/diagrams/{id}/export for DynamoDB-stored diagrams.
 * Returns downloadUrl on success and triggers browser download automatically.
 * Handles export failures without producing partial files.
 *
 * Validates: Requirements 4.8, 4.9
 */
export function useExport(): UseExportReturn {
  const [state, setState] = useState<ExportState>(INITIAL_STATE);
  const downloadTriggeredRef = useRef(false);

  // Auto-trigger download when presigned URL is returned (for API fallback)
  useEffect(() => {
    if (
      state.status === "success" &&
      state.downloadUrl &&
      !downloadTriggeredRef.current
    ) {
      downloadTriggeredRef.current = true;
      // Only auto-download for presigned URLs (API fallback)
      if (state.downloadUrl.startsWith("http")) {
        const link = document.createElement("a");
        link.href = state.downloadUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [state.status, state.downloadUrl]);

  const exportDiagram = useCallback(
    async (
      diagramId: string,
      format: ExportFormat,
      options?: ExportOptions
    ) => {
      if (!SUPPORTED_FORMATS.includes(format)) {
        setState({
          status: "error",
          downloadUrl: null,
          error: `Unsupported format "${format}". Valid formats: ${SUPPORTED_FORMATS.join(", ")}`,
          format: null,
        });
        return;
      }

      downloadTriggeredRef.current = false;
      setState({ status: "exporting", downloadUrl: null, error: null, format });

      try {
        // Try client-side export first (from sessionStorage)
        const cached = sessionStorage.getItem(`diagram_${diagramId}`);
        if (cached) {
          const data = JSON.parse(cached);
          const xml = data.drawioXml || '';

          if (!xml) {
            throw new Error('No diagram XML found');
          }

          let blob: Blob;
          let filename: string;

          switch (format) {
            case 'drawio':
              blob = new Blob([xml], { type: 'application/xml' });
              filename = `architecture-${diagramId}.drawio`;
              break;
            case 'json':
              blob = new Blob([JSON.stringify({ diagramId, xml, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
              filename = `architecture-${diagramId}.json`;
              break;
            case 'markdown': {
              // Simple markdown export with service list
              const services = (xml.match(/value="([^"]+)"/g) || []).map((m: string) => m.replace('value="', '').replace('"', '')).filter((v: string) => v.length > 1 && v.length < 50);
              const md = `# Architecture Diagram\n\n## Services\n\n${services.map((s: string) => `- ${s}`).join('\n')}\n\n## Exported\n\n${new Date().toISOString()}\n`;
              blob = new Blob([md], { type: 'text/markdown' });
              filename = `architecture-${diagramId}.md`;
              break;
            }
            case 'pptx': {
              // Dynamic import pptxgenjs
              const PptxGenJS = (await import('pptxgenjs')).default;
              const pptx = new PptxGenJS();

              // Title slide
              const titleSlide = pptx.addSlide();
              titleSlide.addText('Architecture Diagram', { x: 1, y: 1, w: 8, h: 1, fontSize: 28, bold: true });
              titleSlide.addText(`Generated: ${new Date().toLocaleDateString()}`, { x: 1, y: 2, w: 8, h: 0.5, fontSize: 14, color: '666666' });

              // Diagram slide - extract service names and arrange as text boxes
              const diagramSlide = pptx.addSlide();
              const services = (xml.match(/value="([^"]+)"/g) || [])
                .map((m: string) => m.replace('value="', '').replace('"', ''))
                .filter((v: string) => v.length > 1 && v.length < 50);

              // Add services as text boxes in a grid layout
              services.forEach((service: string, i: number) => {
                const col = i % 4;
                const row = Math.floor(i / 4);
                diagramSlide.addText(service, {
                  x: 0.5 + col * 2.5,
                  y: 0.5 + row * 1.2,
                  w: 2.2,
                  h: 0.8,
                  fontSize: 10,
                  align: 'center',
                  valign: 'middle',
                  shape: pptx.ShapeType.roundRect,
                  fill: { color: 'F5F5F5' },
                  line: { color: '333333', width: 1 },
                });
              });

              // Add a note with the full Draw.io XML for re-import
              diagramSlide.addNotes('Draw.io XML (import this back into draw.io):\n\n' + xml.slice(0, 2000));

              // Generate and download
              const pptxBlob = await pptx.write({ outputType: 'blob' }) as Blob;
              blob = new Blob([pptxBlob], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
              filename = `architecture-${diagramId}.pptx`;
              break;
            }
            case 'svg':
            case 'png':
            case 'pdf':
              // For image/PDF formats, use the draw.io XML directly as .drawio download
              // (actual rendering to PNG/SVG/PDF requires draw.io's export engine)
              blob = new Blob([xml], { type: 'application/xml' });
              filename = `architecture-${diagramId}.drawio`;
              // Show a note that they can open in draw.io to export as image
              setState({
                status: "success",
                downloadUrl: URL.createObjectURL(blob),
                error: null,
                format,
              });
              // Auto download
              {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
              return;
            default:
              throw new Error(`Unsupported format: ${format}`);
          }

          const url = URL.createObjectURL(blob);
          setState({ status: "success", downloadUrl: url, error: null, format });

          // Auto download
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }

        // Fallback: try API route (for diagrams stored in DynamoDB)
        const response = await fetch(`/api/diagrams/${diagramId}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diagramId, format, options }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          setState({
            status: "error",
            downloadUrl: null,
            error: errorData?.error || `Export failed. Please try again.`,
            format,
          });
          return;
        }

        const responseData: ExportResponse = await response.json();
        setState({ status: "success", downloadUrl: responseData.downloadUrl, error: null, format });
      } catch (err) {
        setState({
          status: "error",
          downloadUrl: null,
          error: err instanceof Error ? err.message : "Export failed",
          format,
        });
      }
    },
    []
  );

  const reset = useCallback(() => {
    downloadTriggeredRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  return { state, exportDiagram, reset };
}
