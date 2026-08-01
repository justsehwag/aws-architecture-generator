'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { useVersionHistory } from '@/hooks/useVersionHistory';
import { cn } from '@/lib/utils';
import type { DiagramVersion } from '@/types/version';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VersionHistoryProps {
  /** The diagram ID to display version history for */
  diagramId: string;
  /** Callback invoked after a successful restore */
  onRestoreSuccess?: (version: DiagramVersion) => void;
  /** Additional className for the container */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a timestamp as a relative or absolute time string.
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * VersionHistory component
 *
 * Displays a chronological list (newest first) of diagram versions.
 * Each entry shows the version name or "Autosave" label, timestamp, and user.
 * Provides a "Restore" button that confirms with the user before restoring,
 * autosaving the current state first (Requirement 10.5).
 *
 * Validates: Requirements 10.4, 10.5
 */
export function VersionHistory({
  diagramId,
  onRestoreSuccess,
  className,
}: VersionHistoryProps) {
  const {
    status,
    versions,
    errorMessage,
    restoreStatus,
    pendingRestoreVersion,
    fetchVersions,
    requestRestore,
    confirmRestore,
    cancelRestore,
    dismissError,
  } = useVersionHistory({
    diagramId,
    fetchOnMount: true,
    onRestoreSuccess,
  });

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Version History</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchVersions}
          disabled={status === 'loading'}
          aria-label="Refresh version history"
        >
          <RefreshIcon
            className={cn(
              'h-4 w-4',
              status === 'loading' && 'animate-spin'
            )}
          />
        </Button>
      </div>

      {/* Loading state */}
      {status === 'loading' && versions.length === 0 && (
        <div
          className="flex items-center justify-center py-8"
          role="status"
          aria-live="polite"
        >
          <SpinnerIcon className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading versions...
          </span>
        </div>
      )}

      {/* Error state (fetch) */}
      {status === 'error' && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={fetchVersions}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Restore error */}
      {restoreStatus === 'error' && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-medium text-destructive">
            Restore Failed
          </p>
          <p className="mt-1 text-sm text-destructive/90">
            {errorMessage || 'Your current diagram state is unchanged.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={dismissError}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Empty state */}
      {status === 'loaded' && versions.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No versions yet. Versions are created when you save or autosave.
        </p>
      )}

      {/* Version list */}
      {versions.length > 0 && (
        <ul
          className="flex flex-col gap-1"
          role="list"
          aria-label="Version history list"
        >
          {versions.map((version) => (
            <VersionItem
              key={version.versionId}
              version={version}
              onRestore={requestRestore}
              isRestoring={
                restoreStatus === 'restoring' &&
                pendingRestoreVersion?.versionId === version.versionId
              }
            />
          ))}
        </ul>
      )}

      {/* Confirm restore dialog */}
      <Dialog
        open={restoreStatus === 'confirming'}
        onOpenChange={(open) => {
          if (!open) cancelRestore();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>
              This will autosave your current work first, then restore the
              selected version. You can always recover your current state from
              the version history.
            </DialogDescription>
          </DialogHeader>

          {pendingRestoreVersion && (
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <p className="text-sm font-medium">
                {pendingRestoreVersion.isAutosave
                  ? 'Autosave'
                  : pendingRestoreVersion.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatTimestamp(pendingRestoreVersion.createdAt)} by{' '}
                {pendingRestoreVersion.createdBy}
              </p>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={confirmRestore} aria-label="Confirm restore">
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface VersionItemProps {
  version: DiagramVersion;
  onRestore: (version: DiagramVersion) => void;
  isRestoring: boolean;
}

function VersionItem({ version, onRestore, isRestoring }: VersionItemProps) {
  return (
    <li
      className={cn(
        'flex items-center justify-between rounded-md border border-border px-3 py-2',
        'transition-colors hover:bg-accent/50',
        version.isAutosave && 'border-dashed'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {version.isAutosave ? 'Autosave' : version.name}
          </span>
          {version.isAutosave && (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Auto
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatTimestamp(version.createdAt)}
          {version.createdBy && (
            <span> &middot; {version.createdBy}</span>
          )}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onRestore(version)}
        disabled={isRestoring}
        aria-label={`Restore version: ${version.isAutosave ? 'Autosave' : version.name}`}
        className="ml-2 shrink-0"
      >
        {isRestoring ? (
          <>
            <SpinnerIcon className="mr-1 h-3 w-3 animate-spin" />
            Restoring...
          </>
        ) : (
          'Restore'
        )}
      </Button>
    </li>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
