/**
 * Dashboard API Route - GET /api/user/dashboard
 *
 * Returns dashboard data for the authenticated user:
 * - Up to 10 most-recently-modified diagrams
 * - Usage statistics (total diagrams, total generations)
 *
 * Validates: Requirements 11.1, 11.8
 */

import { NextResponse } from 'next/server';
import { validateApiAuth, unauthorizedResponse } from '@/lib/auth/api-auth';
import { listUserDiagrams } from '@/lib/db/diagrams';

/**
 * Shape of a recent diagram item returned to the client.
 */
interface RecentDiagramItem {
  diagramId: string;
  name: string;
  updatedAt: string;
  serviceCount: number;
  status: string;
}

/**
 * Shape of the dashboard response.
 */
interface DashboardResponse {
  recentDiagrams: RecentDiagramItem[];
  stats: {
    totalDiagrams: number;
    totalGenerations: number;
  };
}

/**
 * GET /api/user/dashboard
 *
 * Returns the authenticated user's dashboard data including
 * recent diagrams (limit 10) and usage statistics.
 */
export async function GET(): Promise<NextResponse> {
  const auth = await validateApiAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error) as unknown as NextResponse;
  }

  try {
    // Fetch user's diagrams (all of them for stats, but limit display to 10)
    const allDiagrams = await listUserDiagrams(auth.userId!, 50);
    const allItems = allDiagrams.items;

    // Sort by updatedAt descending and take top 10 for recent display
    const sorted = [...allItems].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const recentDiagrams: RecentDiagramItem[] = sorted.slice(0, 10).map((d) => ({
      diagramId: d.diagramId,
      name: d.name,
      updatedAt: d.updatedAt,
      serviceCount: d.serviceCount,
      status: d.status,
    }));

    // Compute statistics
    const totalDiagrams = allItems.length;
    // Count diagrams with status 'ready' as completed generations
    const totalGenerations = allItems.filter((d) => d.status === 'ready').length;

    const response: DashboardResponse = {
      recentDiagrams,
      stats: {
        totalDiagrams,
        totalGenerations,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
