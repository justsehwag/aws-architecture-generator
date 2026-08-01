/**
 * OfflineQueueManager - Manages queuing of changes when the app is offline.
 *
 * Stores up to 20 changes in localStorage in FIFO order.
 * Syncs queued changes on reconnection within 5 minutes.
 *
 * @validates Requirements 13.2
 */

export interface OfflineQueueEntry {
  id: string;
  timestamp: string;
  action: 'save' | 'autosave' | 'export' | 'delete';
  endpoint: string;
  payload: unknown;
  retryCount: number;
}

export interface SyncResult {
  succeeded: string[];
  failed: string[];
}

const STORAGE_KEY = 'offline_queue';
const MAX_QUEUE_SIZE = 20;
const SYNC_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_COUNT = 3;

export class OfflineQueueManager {
  readonly MAX_QUEUE_SIZE = MAX_QUEUE_SIZE;
  readonly SYNC_TIMEOUT_MS = SYNC_TIMEOUT_MS;

  private storage: Storage | null;

  constructor(storage?: Storage) {
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  }

  /**
   * Add an entry to the offline queue. Returns true if enqueued, false if queue is full.
   */
  enqueue(entry: OfflineQueueEntry): boolean {
    const queue = this.getQueue();
    if (queue.length >= MAX_QUEUE_SIZE) {
      return false;
    }
    queue.push(entry);
    this.saveQueue(queue);
    return true;
  }

  /**
   * Remove and return the oldest entry from the queue (FIFO).
   */
  dequeue(): OfflineQueueEntry | undefined {
    const queue = this.getQueue();
    if (queue.length === 0) {
      return undefined;
    }
    const entry = queue.shift();
    this.saveQueue(queue);
    return entry;
  }

  /**
   * Read the current queue without modifying it.
   */
  getQueue(): OfflineQueueEntry[] {
    if (!this.storage) {
      return [];
    }
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as OfflineQueueEntry[];
    } catch {
      return [];
    }
  }

  /**
   * Get the number of items currently in the queue.
   */
  get size(): number {
    return this.getQueue().length;
  }

  /**
   * Process all queued entries in FIFO order on reconnection.
   * Each entry is sent via fetch. If an entry fails after MAX_RETRY_COUNT,
   * it is removed from the queue and reported as failed.
   * The entire sync operation is bounded by SYNC_TIMEOUT_MS (5 minutes).
   */
  async syncOnReconnect(
    fetchFn: (endpoint: string, payload: unknown) => Promise<Response> = defaultFetch
  ): Promise<SyncResult> {
    const result: SyncResult = { succeeded: [], failed: [] };
    const startTime = Date.now();

    const queue = this.getQueue();
    if (queue.length === 0) {
      return result;
    }

    const remaining: OfflineQueueEntry[] = [];

    for (const entry of queue) {
      // Check timeout
      if (Date.now() - startTime > SYNC_TIMEOUT_MS) {
        remaining.push(entry);
        continue;
      }

      try {
        const response = await fetchFn(entry.endpoint, entry.payload);
        if (response.ok) {
          result.succeeded.push(entry.id);
        } else {
          entry.retryCount++;
          if (entry.retryCount > MAX_RETRY_COUNT) {
            result.failed.push(entry.id);
          } else {
            remaining.push(entry);
          }
        }
      } catch {
        entry.retryCount++;
        if (entry.retryCount > MAX_RETRY_COUNT) {
          result.failed.push(entry.id);
        } else {
          remaining.push(entry);
        }
      }
    }

    this.saveQueue(remaining);
    return result;
  }

  /**
   * Clear the entire queue.
   */
  clear(): void {
    if (this.storage) {
      this.storage.removeItem(STORAGE_KEY);
    }
  }

  private saveQueue(queue: OfflineQueueEntry[]): void {
    if (this.storage) {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  }
}

async function defaultFetch(endpoint: string, payload: unknown): Promise<Response> {
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Singleton instance for app-wide usage
export const offlineQueueManager = new OfflineQueueManager();
