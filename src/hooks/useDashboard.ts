/**
 * useDashboard Hook
 *
 * Fetches dashboard data from GET /api/user/dashboard.
 * Returns recent diagrams, usage statistics, and loading state.
 *
 * Validates: Requirements 11.1, 11.8
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * A recent diagram displayed on the dashboard.
 */
export interface RecentDiagram {
  diagramId: string;
  name: string;
  updatedAt: string;
  serviceCount: number;
  status: string;
}

/**
 * Usage statistics for the dashboard.
 */
export interface DashboardStats {
  totalDiagrams: number;
  totalGenerations: number;
}

/**
 * Shape returned by the useDashboard hook.
 */
export interface UseDashboardReturn {
  recentDiagrams: RecentDiagram[];
  stats: DashboardStats;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook that fetches and manages dashboard data including
 * recent diagrams and usage statistics.
 */
export function useDashboard(): UseDashboardReturn {
  const [recentDiagrams, setRecentDiagrams] = useState<RecentDiagram[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDiagrams: 0,
    totalGenerations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/dashboard');

      if (!response.ok) {
        if (response.status === 401) {
          setRecentDiagrams([]);
          setStats({ totalDiagrams: 0, totalGenerations: 0 });
          return;
        }
        throw new Error('Failed to load dashboard data');
      }

      const data = await response.json();
      let diagrams: RecentDiagram[] = data.recentDiagrams ?? [];

      // Merge with localStorage drafts (for diagrams not yet in DynamoDB)
      if (typeof window !== 'undefined') {
        try {
          const drafts = JSON.parse(localStorage.getItem('diagram_drafts') || '[]') as Array<{ diagramId: string; name: string; createdAt: string; spec?: { services?: unknown[] } }>;
          const existingIds = new Set(diagrams.map(d => d.diagramId));
          for (const draft of drafts) {
            if (!existingIds.has(draft.diagramId)) {
              diagrams.push({
                diagramId: draft.diagramId,
                name: draft.name || 'Untitled',
                updatedAt: draft.createdAt,
                serviceCount: (draft.spec?.services as unknown[])?.length || 0,
                status: 'draft',
              });
            }
          }
        } catch { /* ignore localStorage errors */ }
      }

      setRecentDiagrams(diagrams);
      setStats({
        totalDiagrams: diagrams.length,
        totalGenerations: data.stats?.totalGenerations ?? diagrams.length,
      });
    } catch (err) {
      // If API fails, still show localStorage drafts
      if (typeof window !== 'undefined') {
        try {
          const drafts = JSON.parse(localStorage.getItem('diagram_drafts') || '[]') as Array<{ diagramId: string; name: string; createdAt: string; spec?: { services?: unknown[] } }>;
          const diagrams = drafts.map(d => ({
            diagramId: d.diagramId,
            name: d.name || 'Untitled',
            updatedAt: d.createdAt,
            serviceCount: (d.spec?.services as unknown[])?.length || 0,
            status: 'draft',
          }));
          setRecentDiagrams(diagrams);
          setStats({ totalDiagrams: diagrams.length, totalGenerations: diagrams.length });
          setIsLoading(false);
          return;
        } catch { /* ignore */ }
      }
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setRecentDiagrams([]);
      setStats({ totalDiagrams: 0, totalGenerations: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    recentDiagrams,
    stats,
    isLoading,
    error,
    refresh: fetchDashboard,
  };
}
