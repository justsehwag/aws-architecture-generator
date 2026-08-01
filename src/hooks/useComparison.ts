/**
 * useComparison Hook
 *
 * Manages architecture comparison state between two diagram versions.
 * Fetches both versions' architecture specs and computes the diff.
 *
 * Validates: Requirements 17.1, 17.7
 */

'use client';

import { useState, useCallback } from 'react';
import type { ArchitectureSpec } from '@/types/architecture';
import { diffDiagrams } from '@/lib/comparison/diagram-diff';
import type { DiagramDiffResult } from '@/lib/comparison/diagram-diff';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComparisonStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ComparisonState {
  /** Current comparison operation status */
  status: ComparisonStatus;
  /** Architecture spec for version A (left panel) */
  specA: ArchitectureSpec | null;
  /** Architecture spec for version B (right panel) */
  specB: ArchitectureSpec | null;
  /** Computed diff between the two specs */
  diff: DiagramDiffResult | null;
  /** Error message if comparison failed */
  errorMessage: string | null;
}

export interface UseComparisonReturn extends ComparisonState {
  /** Compare two versions by their IDs */
  compare: (diagramId: string, versionIdA: string, versionIdB: string) => Promise<void>;
  /** Reset comparison state */
  reset: () => void;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

export function useComparison(): UseComparisonReturn {
  const [status, setStatus] = useState<ComparisonStatus>('idle');
  const [specA, setSpecA] = useState<ArchitectureSpec | null>(null);
  const [specB, setSpecB] = useState<ArchitectureSpec | null>(null);
  const [diff, setDiff] = useState<DiagramDiffResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Fetch a version's architecture spec from the API.
   */
  const fetchVersionSpec = async (
    diagramId: string,
    versionId: string
  ): Promise<ArchitectureSpec> => {
    const response = await fetch(
      `/api/diagrams/${diagramId}/versions/${versionId}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string }).error ||
          `Failed to fetch version ${versionId} (status ${response.status})`
      );
    }

    const data = await response.json();
    return data.architectureSpec as ArchitectureSpec;
  };

  /**
   * Compare two diagram versions by fetching both specs and computing the diff.
   */
  const compare = useCallback(
    async (
      diagramId: string,
      versionIdA: string,
      versionIdB: string
    ): Promise<void> => {
      setStatus('loading');
      setErrorMessage(null);
      setDiff(null);

      try {
        const [fetchedSpecA, fetchedSpecB] = await Promise.all([
          fetchVersionSpec(diagramId, versionIdA),
          fetchVersionSpec(diagramId, versionIdB),
        ]);

        const diffResult = diffDiagrams(fetchedSpecA, fetchedSpecB);

        setSpecA(fetchedSpecA);
        setSpecB(fetchedSpecB);
        setDiff(diffResult);
        setStatus('ready');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to compare architecture versions';
        setErrorMessage(message);
        setStatus('error');
      }
    },
    []
  );

  /**
   * Reset comparison state back to idle.
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setSpecA(null);
    setSpecB(null);
    setDiff(null);
    setErrorMessage(null);
  }, []);

  return {
    status,
    specA,
    specB,
    diff,
    errorMessage,
    compare,
    reset,
  };
}
