"use client";

import { useState, useCallback } from "react";
import type { CostEstimate, UsageAssumptions } from "@/types/cost";

export type CostStatus = "idle" | "loading" | "success" | "error";

export interface CostState {
  status: CostStatus;
  data: CostEstimate | null;
  error: string | null;
}

export interface UseCostEstimateReturn {
  state: CostState;
  fetchCost: (diagramId: string) => Promise<void>;
  recalculate: (
    diagramId: string,
    assumptions: Partial<UsageAssumptions>
  ) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: CostState = {
  status: "idle",
  data: null,
  error: null,
};

/**
 * Hook that manages cost estimation state.
 * Fetches from GET /api/diagrams/[id]/cost and supports
 * PUT with updated assumptions for recalculation.
 *
 * Validates: Requirements 7.2, 7.4
 */
export function useCostEstimate(): UseCostEstimateReturn {
  const [state, setState] = useState<CostState>(INITIAL_STATE);

  const fetchCost = useCallback(async (diagramId: string) => {
    setState({ status: "loading", data: null, error: null });

    try {
      const response = await fetch(`/api/diagrams/${diagramId}/cost`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        // Fall back to local cost estimation from cached spec
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(`diagram_${diagramId}`) : null;
        if (cached) {
          const cachedData = JSON.parse(cached);
          const spec = cachedData.architectureSpec;
          if (spec?.services) {
            const pricing: Record<string, number> = { 'ec2': 33.87, 'lambda': 0.20, 's3': 2.30, 'dynamodb': 1.25, 'rds': 70.08, 'aurora': 73.00, 'api-gateway': 3.50, 'cloudfront': 8.50, 'alb': 22.26, 'ecs': 29.55, 'fargate': 36.04, 'sqs': 0.40, 'sns': 0.50, 'cognito': 0.00, 'kinesis': 10.95, 'elasticache': 49.64, 'nat-gateway': 37.35, 'route53': 0.50, 'kms': 1.00, 'cloudwatch': 10.00, 'waf': 5.60, 'vpc': 0, 'iam': 0 };
            const services = spec.services.map((s: { id: string; type: string; label: string }) => ({
              serviceId: s.id, serviceType: s.type, label: s.label,
              monthlyCost: pricing[s.type] ?? 0, available: (s.type in pricing),
            }));
            const total = services.filter((s: { available: boolean }) => s.available).reduce((sum: number, s: { monthlyCost: number }) => sum + s.monthlyCost, 0);
            const localData: CostEstimate = {
              totalMonthlyCost: Math.round(total * 100) / 100,
              services,
              assumptions: { computeHoursPerMonth: 730, requestsPerMonth: 1000000, dataTransferGB: 100, storageGB: 50 },
            } as unknown as CostEstimate;
            setState({ status: "success", data: localData, error: null });
            return;
          }
        }
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.error ||
          `Failed to fetch cost estimate (status ${response.status}).`;
        setState({ status: "error", data: null, error: errorMessage });
        return;
      }

      const data: CostEstimate = await response.json();
      setState({ status: "success", data, error: null });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while fetching cost estimate.";
      setState({ status: "error", data: null, error: message });
    }
  }, []);

  const recalculate = useCallback(
    async (diagramId: string, assumptions: Partial<UsageAssumptions>) => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));

      try {
        const response = await fetch(`/api/diagrams/${diagramId}/cost`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assumptions }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage =
            errorData?.error ||
            `Failed to recalculate cost estimate (status ${response.status}).`;
          setState((prev) => ({
            ...prev,
            status: "error",
            error: errorMessage,
          }));
          return;
        }

        const data: CostEstimate = await response.json();
        setState({ status: "success", data, error: null });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during cost recalculation.";
        setState((prev) => ({ ...prev, status: "error", error: message }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return { state, fetchCost, recalculate, reset };
}
