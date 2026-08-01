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
  | "markdown";

export const SUPPORTED_FORMATS: ExportFormat[] = [
  "drawio",
  "png",
  "svg",
  "pdf",
  "json",
  "markdown",
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
 * Calls POST /api/diagrams/{id}/export with format and options.
 * Returns downloadUrl on success and triggers browser download automatically.
 * Handles export failures without producing partial files.
 *
 * Validates: Requirements 4.8, 4.9
 */
export function useExport(): UseExportReturn {
  const [state, setState] = useState<ExportState>(INITIAL_STATE);
  const downloadTriggeredRef = useRef(false);

  // Auto-trigger download when presigned URL is returned
  useEffect(() => {
    if (
      state.status === "success" &&
      state.downloadUrl &&
      !downloadTriggeredRef.current
    ) {
      downloadTriggeredRef.current = true;
      // Use an anchor element to trigger download
      const link = document.createElement("a");
      link.href = state.downloadUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [state.status, state.downloadUrl]);

  const exportDiagram = useCallback(
    async (
      diagramId: string,
      format: ExportFormat,
      options?: ExportOptions
    ) => {
      // Validate format before making the request
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
      setState({
        status: "exporting",
        downloadUrl: null,
        error: null,
        format,
      });

      try {
        const response = await fetch(`/api/diagrams/${diagramId}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diagramId, format, options }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage =
            errorData?.message ||
            errorData?.error ||
            `Export failed with status ${response.status}. Please try again.`;
          setState({
            status: "error",
            downloadUrl: null,
            error: errorMessage,
            format,
          });
          return;
        }

        const data: ExportResponse = await response.json();

        setState({
          status: "success",
          downloadUrl: data.downloadUrl,
          error: null,
          format,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during export";
        setState({
          status: "error",
          downloadUrl: null,
          error: message,
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
