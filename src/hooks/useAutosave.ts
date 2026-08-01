/**
 * useAutosave Hook
 *
 * Autosaves diagram state every 30 seconds while editing.
 * Uses the existing DynamoDB versions API via POST to the versions endpoint.
 *
 * Features:
 * - Autosaves every 30 seconds (Requirement 10.1)
 * - Debounces to avoid saving unchanged state
 * - Shows warning indicator on failure (Requirement 10.6)
 * - Retries failed saves after 30 seconds (Requirement 10.6)
 *
 * Validates: Requirements 10.1, 10.6
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutosaveState {
  /** Current autosave status */
  status: AutosaveStatus;
  /** Timestamp of last successful autosave */
  lastSavedAt: string | null;
  /** Error message if last save failed */
  errorMessage: string | null;
  /** Whether the warning indicator should be shown */
  showWarning: boolean;
}

export interface UseAutosaveOptions {
  /** The diagram ID to autosave for */
  diagramId: string | null;
  /** Function that returns the current diagram content */
  getContent: () => string | null;
  /** Autosave interval in milliseconds (default: 30000ms = 30s) */
  intervalMs?: number;
  /** Whether autosave is enabled (default: true) */
  enabled?: boolean;
}

export interface UseAutosaveReturn extends AutosaveState {
  /** Manually trigger an autosave */
  triggerSave: () => Promise<void>;
  /** Reset the warning/error state */
  dismissWarning: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_INTERVAL_MS = 30_000; // 30 seconds
const RETRY_INTERVAL_MS = 30_000; // Retry after 30 seconds on failure

// ─── Hook Implementation ──────────────────────────────────────────────────────

export function useAutosave(options: UseAutosaveOptions): UseAutosaveReturn {
  const {
    diagramId,
    getContent,
    intervalMs = DEFAULT_INTERVAL_MS,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // Track last saved content to avoid saving unchanged state
  const lastSavedContentRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Use a ref for performSave to break the circular dependency
  const performSaveRef = useRef<() => Promise<boolean>>(async () => false);

  /**
   * Schedules a retry after a failed save.
   */
  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        performSaveRef.current();
      }
    }, RETRY_INTERVAL_MS);
  }, []);

  /**
   * Performs the actual autosave API call.
   */
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!diagramId) return false;

    const content = getContent();
    if (!content) return false;

    // Skip if content hasn't changed since last save
    if (content === lastSavedContentRef.current) {
      return true;
    }

    setStatus('saving');
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/diagrams/${diagramId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Autosave',
          content,
          isAutosave: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || `Autosave failed with status ${response.status}`
        );
      }

      if (isMountedRef.current) {
        lastSavedContentRef.current = content;
        setStatus('saved');
        setLastSavedAt(new Date().toISOString());
        setShowWarning(false);
        setErrorMessage(null);
      }

      return true;
    } catch (error) {
      if (isMountedRef.current) {
        const message =
          error instanceof Error ? error.message : 'Autosave failed';
        setStatus('error');
        setErrorMessage(message);
        setShowWarning(true);

        // Schedule retry after 30 seconds (Requirement 10.6)
        scheduleRetry();
      }

      return false;
    }
  }, [diagramId, getContent, scheduleRetry]);

  // Keep the ref in sync with the latest performSave
  useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  /**
   * Public method to manually trigger an autosave.
   */
  const triggerSave = useCallback(async (): Promise<void> => {
    await performSave();
  }, [performSave]);

  /**
   * Dismiss the warning indicator.
   */
  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    setErrorMessage(null);
  }, []);

  // Set up the autosave interval
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !diagramId) {
      return;
    }

    // Start the autosave interval
    intervalRef.current = setInterval(() => {
      performSaveRef.current();
    }, intervalMs);

    return () => {
      isMountedRef.current = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [enabled, diagramId, intervalMs]);

  return {
    status,
    lastSavedAt,
    errorMessage,
    showWarning,
    triggerSave,
    dismissWarning,
  };
}
