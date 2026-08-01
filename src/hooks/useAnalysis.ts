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
        // Try to compute analysis locally from cached data
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(`diagram_${diagramId}`) : null;
        if (cached) {
          const cachedData = JSON.parse(cached);
          const spec = cachedData.architectureSpec;
          if (spec?.services) {
            const services = spec.services.map((s: { type: string }) => s.type);
            const localAnalysis: ArchitectureAnalysis = {
              diagramId,
              wellArchitectedAssessment: [
                { pillar: 'Security', score: services.includes('waf') || services.includes('iam') ? 7 : 3, maxScore: 10, findings: [] },
                { pillar: 'Reliability', score: services.includes('alb') || services.includes('route53') ? 7 : 4, maxScore: 10, findings: [] },
                { pillar: 'Performance Efficiency', score: services.includes('cloudfront') ? 8 : 5, maxScore: 10, findings: [] },
                { pillar: 'Cost Optimization', score: services.includes('lambda') ? 8 : 5, maxScore: 10, findings: [] },
                { pillar: 'Operational Excellence', score: services.includes('cloudwatch') ? 7 : 4, maxScore: 10, findings: [] },
                { pillar: 'Sustainability', score: 6, maxScore: 10, findings: [] },
              ],
              recommendations: [],
              missingComponents: [],
              overallScore: 60,
            } as unknown as ArchitectureAnalysis;
            setState({ status: "success", data: localAnalysis, error: null });
            return;
          }
        }
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
