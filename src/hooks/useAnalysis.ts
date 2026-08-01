"use client";

import { useState, useEffect, useCallback } from "react";
import type { ArchitectureAnalysis } from "@/types/analysis";

export type AnalysisStatus = "idle" | "loading" | "success" | "error";

export interface UseAnalysisState {
  status: AnalysisStatus;
  data: ArchitectureAnalysis | null;
  error: string | null;
}

export interface UseAnalysisReturn extends UseAnalysisState {
  refetch: () => void;
}

/**
 * Hook to fetch architecture analysis for a given diagram.
 * Fetches from GET /api/diagrams/[id]/analysis.
 * Manages loading, error, and data states.
 */
export function useAnalysis(diagramId: string | null): UseAnalysisReturn {
  const [state, setState] = useState<UseAnalysisState>({
    status: "idle",
    data: null,
    error: null,
  });

  const fetchAnalysis = useCallback(async () => {
    if (!diagramId) {
      setState({ status: "idle", data: null, error: null });
      return;
    }

    setState({ status: "loading", data: null, error: null });

    try {
      const response = await fetch(`/api/diagrams/${diagramId}/analysis`);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error || `Analysis request failed (${response.status})`;
        setState({ status: "error", data: null, error: message });
        return;
      }

      const data: ArchitectureAnalysis = await response.json();
      setState({ status: "success", data, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch analysis";
      setState({ status: "error", data: null, error: message });
    }
  }, [diagramId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return {
    ...state,
    refetch: fetchAnalysis,
  };
}
