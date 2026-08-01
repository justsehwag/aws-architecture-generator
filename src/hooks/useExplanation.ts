"use client";

import { useState, useCallback } from "react";
import type { ArchitectureExplanation } from "@/types/api";

export type ExplanationStatus = "idle" | "loading" | "success" | "error";

export interface ExplanationState {
  status: ExplanationStatus;
  data: ArchitectureExplanation | null;
  error: string | null;
}

export interface UseExplanationReturn {
  state: ExplanationState;
  fetchExplanation: (diagramId: string) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: ExplanationState = {
  status: "idle",
  data: null,
  error: null,
};

/**
 * Hook that fetches the architecture explanation from GET /api/diagrams/[id]/explanation.
 * Returns the ArchitectureExplanation object including summary, service descriptions,
 * and best practice recommendations.
 *
 * Manages loading, success, and error states.
 *
 * Validates: Requirements 8.5
 */
export function useExplanation(): UseExplanationReturn {
  const [state, setState] = useState<ExplanationState>(INITIAL_STATE);

  const fetchExplanation = useCallback(async (diagramId: string) => {
    if (!diagramId) {
      setState({
        status: "error",
        data: null,
        error: "Diagram ID is required to fetch explanation.",
      });
      return;
    }

    setState({
      status: "loading",
      data: null,
      error: null,
    });

    try {
      const response = await fetch(`/api/diagrams/${diagramId}/explanation`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.error ||
          `Failed to load explanation (status ${response.status}). Please try again.`;
        setState({
          status: "error",
          data: null,
          error: errorMessage,
        });
        return;
      }

      const data: ArchitectureExplanation = await response.json();

      setState({
        status: "success",
        data,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading the explanation.";
      setState({
        status: "error",
        data: null,
        error: message,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return { state, fetchExplanation, reset };
}
