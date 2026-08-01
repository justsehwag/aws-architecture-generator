'use client';

import Link from 'next/link';
import { useDashboard } from '@/hooks/useDashboard';

export default function SavedDiagramsPage() {
  const { recentDiagrams, isLoading, error, refresh } = useDashboard();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Saved Diagrams</h1>
          <p className="mt-1 text-muted-foreground">All your architecture diagrams</p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Diagram
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted/50" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={refresh} className="mt-2 text-sm font-medium text-destructive underline">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && recentDiagrams.length === 0 && (
        <div className="flex flex-col items-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No diagrams yet. Create your first one!</p>
          <Link
            href="/create"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Diagram
          </Link>
        </div>
      )}

      {!isLoading && recentDiagrams.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentDiagrams.map((d) => (
            <Link
              key={d.diagramId}
              href={`/diagram/${d.diagramId}`}
              className="rounded-lg border bg-card p-4 shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
            >
              <h3 className="truncate text-sm font-medium">{d.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{d.serviceCount} services</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
