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
