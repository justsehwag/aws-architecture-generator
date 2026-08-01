'use client';

import React from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { cn } from '@/lib/utils';

/**
 * OfflineIndicator - Displays a banner when the user is offline.
 *
 * Shows "You're offline. Changes saved locally." when disconnected.
 * Shows a brief "Back online" message on reconnection.
 * Disappears when the connection is stable.
 *
 * @validates Requirements 13.2
 */
export function OfflineIndicator() {
  const { isOnline, wasOffline, isSyncing, queueSize } = useOfflineStatus();

  // Nothing to show when online and not recently reconnected
  if (isOnline && !wasOffline && !isSyncing) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'px-4 py-2 rounded-lg shadow-lg',
        'text-sm font-medium transition-all duration-300',
        'flex items-center gap-2',
        !isOnline && 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700',
        isOnline && wasOffline && 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100 border border-green-200 dark:border-green-700',
        isOnline && isSyncing && 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700'
      )}
    >
      {!isOnline && (
        <>
          <OfflineIcon />
          <span>
            You&apos;re offline. Changes saved locally.
            {queueSize > 0 && (
              <span className="ml-1 text-xs opacity-75">
                ({queueSize} pending)
              </span>
            )}
          </span>
        </>
      )}
      {isOnline && isSyncing && (
        <>
          <SyncIcon />
          <span>Syncing changes...</span>
        </>
      )}
      {isOnline && wasOffline && !isSyncing && (
        <>
          <OnlineIcon />
          <span>Back online. Changes synced.</span>
        </>
      )}
    </div>
  );
}

function OfflineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function OnlineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
