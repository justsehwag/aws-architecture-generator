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
          // User not authenticated - show empty state
          setRecentDiagrams([]);
          setStats({ totalDiagrams: 0, totalGenerations: 0 });
          return;
        }
        throw new Error('Failed to load dashboard data');
      }

      const data = await response.json();
      setRecentDiagrams(data.recentDiagrams ?? []);
      setStats(data.stats ?? { totalDiagrams: 0, totalGenerations: 0 });
    } catch (err) {
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
