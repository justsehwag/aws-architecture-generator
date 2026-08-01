/**
 * useVersionHistory Hook
 *
 * Fetches and manages version history for a diagram.
 * Supports restoring previous versions with autosave-before-restore behavior.
 *
 * Features:
 * - Fetches version list from GET /api/diagrams/[id]/versions
 * - Displays chronological list (newest first)
 * - Restores versions via PUT /api/diagrams/[id]/versions/[vid]/restore
 * - Autosaves current state before restoring (Requirement 10.5)
 * - Handles restore failures gracefully (Requirement 10.7)
 *
 * Validates: Requirements 10.4, 10.5
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { DiagramVersion } from '@/types/version';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VersionHistoryStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type RestoreStatus = 'idle' | 'confirming' | 'restoring' | 'restored' | 'error';

export interface VersionHistoryState {
  /** Current fetch status */
  status: VersionHistoryStatus;
  /** List of versions (newest first) */
  versions: DiagramVersion[];
  /** Error message from fetch or restore */
  errorMessage: string | null;
  /** Current restore operation status */
  restoreStatus: RestoreStatus;
  /** Version currently being restored (for confirmation dialog) */
  pendingRestoreVersion: DiagramVersion | null;
}

export interface UseVersionHistoryOptions {
  /** The diagram ID to fetch versions for */
  diagramId: string | null;
  /** Whether to fetch on mount (default: true) */
  fetchOnMount?: boolean;
  /** Callback invoked after a successful restore */
  onRestoreSuccess?: (version: DiagramVersion) => void;
}

export interface UseVersionHistoryReturn extends VersionHistoryState {
  /** Fetch/refresh the version list */
  fetchVersions: () => Promise<void>;
  /** Initiate a restore (shows confirmation) */
  requestRestore: (version: DiagramVersion) => void;
  /** Confirm and execute the pending restore */
  confirmRestore: () => Promise<void>;
  /** Cancel the pending restore */
  cancelRestore: () => void;
  /** Dismiss error state */
  dismissError: () => void;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

export function useVersionHistory(
  options: UseVersionHistoryOptions
): UseVersionHistoryReturn {
  const { diagramId, fetchOnMount = true, onRestoreSuccess } = options;

  const [status, setStatus] = useState<VersionHistoryStatus>('idle');
  const [versions, setVersions] = useState<DiagramVersion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>('idle');
  const [pendingRestoreVersion, setPendingRestoreVersion] =
    useState<DiagramVersion | null>(null);

  const isMountedRef = useRef(true);

  /**
   * Fetch the version list from the API.
   * Sorts results newest-first by createdAt.
   */
  const fetchVersions = useCallback(async (): Promise<void> => {
    if (!diagramId) return;

    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/diagrams/${diagramId}/versions`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
            `Failed to fetch versions (status ${response.status})`
        );
      }

      const data: DiagramVersion[] = await response.json();

      // Sort newest first (chronological descending)
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (isMountedRef.current) {
        setVersions(sorted);
        setStatus('loaded');
      }
    } catch (error) {
      if (isMountedRef.current) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to fetch version history';
        setErrorMessage(message);
        setStatus('error');
      }
    }
  }, [diagramId]);

  /**
   * Initiate a restore by setting the pending version (triggers confirmation).
   */
  const requestRestore = useCallback((version: DiagramVersion) => {
    setPendingRestoreVersion(version);
    setRestoreStatus('confirming');
  }, []);

  /**
   * Confirm and execute the restore operation.
   * The API will autosave the current state before restoring (Requirement 10.5).
   */
  const confirmRestore = useCallback(async (): Promise<void> => {
    if (!diagramId || !pendingRestoreVersion) return;

    setRestoreStatus('restoring');
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/diagrams/${diagramId}/versions/${pendingRestoreVersion.versionId}/restore`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
            `Restore failed (status ${response.status})`
        );
      }

      if (isMountedRef.current) {
        setRestoreStatus('restored');
        // Refresh the version list to include the new autosave
        await fetchVersions();
        onRestoreSuccess?.(pendingRestoreVersion);
        setPendingRestoreVersion(null);
      }
    } catch (error) {
      if (isMountedRef.current) {
        const message =
          error instanceof Error
            ? error.message
            : 'Version restore failed. Your current diagram state is unchanged.';
        setErrorMessage(message);
        setRestoreStatus('error');
      }
    }
  }, [diagramId, pendingRestoreVersion, fetchVersions, onRestoreSuccess]);

  /**
   * Cancel the pending restore.
   */
  const cancelRestore = useCallback(() => {
    setPendingRestoreVersion(null);
    setRestoreStatus('idle');
  }, []);

  /**
   * Dismiss error state.
   */
  const dismissError = useCallback(() => {
    setErrorMessage(null);
    if (restoreStatus === 'error') {
      setRestoreStatus('idle');
    }
  }, [restoreStatus]);

  // Fetch on mount if configured
  useEffect(() => {
    isMountedRef.current = true;

    if (fetchOnMount && diagramId) {
      fetchVersions();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOnMount, diagramId, fetchVersions]);

  return {
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
  };
}
