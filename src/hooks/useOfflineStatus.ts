'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineQueueManager, type SyncResult } from '@/lib/offline';

export interface OfflineStatusState {
  isOnline: boolean;
  wasOffline: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  queueSize: number;
}

/**
 * Hook that monitors network connectivity and triggers offline queue sync on reconnect.
 *
 * - Tracks navigator.onLine state
 * - Listens for 'online'/'offline' events
 * - On reconnect, triggers OfflineQueueManager.syncOnReconnect()
 * - Returns current online status, whether user was recently offline, and sync state
 *
 * @validates Requirements 13.2
 */
export function useOfflineStatus(): OfflineStatusState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [queueSize, setQueueSize] = useState<number>(0);
  const wasOfflineRef = useRef(false);

  const handleSync = useCallback(async () => {
    const queue = offlineQueueManager.getQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      const result = await offlineQueueManager.syncOnReconnect();
      setLastSyncResult(result);
    } finally {
      setIsSyncing(false);
      setQueueSize(offlineQueueManager.size);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setWasOffline(true);
        handleSync();
        // Reset wasOffline indicator after a brief period
        setTimeout(() => setWasOffline(false), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setQueueSize(offlineQueueManager.size);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize state
    if (!navigator.onLine) {
      wasOfflineRef.current = true;
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleSync]);

  // Poll queue size periodically when offline
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        setQueueSize(offlineQueueManager.size);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  return {
    isOnline,
    wasOffline,
    isSyncing,
    lastSyncResult,
    queueSize,
  };
}
