import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineQueueManager, type OfflineQueueEntry } from './OfflineQueueManager';

function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

function createEntry(overrides: Partial<OfflineQueueEntry> = {}): OfflineQueueEntry {
  return {
    id: `entry-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action: 'save',
    endpoint: '/api/diagrams/123',
    payload: { data: 'test' },
    retryCount: 0,
    ...overrides,
  };
}

describe('OfflineQueueManager', () => {
  let manager: OfflineQueueManager;
  let storage: Storage;

  beforeEach(() => {
    storage = createMockStorage();
    manager = new OfflineQueueManager(storage);
  });

  describe('enqueue', () => {
    it('should add an entry to an empty queue', () => {
      const entry = createEntry({ id: 'test-1' });
      const result = manager.enqueue(entry);

      expect(result).toBe(true);
      expect(manager.size).toBe(1);
      expect(manager.getQueue()[0].id).toBe('test-1');
    });

    it('should maintain FIFO order', () => {
      manager.enqueue(createEntry({ id: 'first' }));
      manager.enqueue(createEntry({ id: 'second' }));
      manager.enqueue(createEntry({ id: 'third' }));

      const queue = manager.getQueue();
      expect(queue[0].id).toBe('first');
      expect(queue[1].id).toBe('second');
      expect(queue[2].id).toBe('third');
    });

    it('should reject entries beyond MAX_QUEUE_SIZE (20)', () => {
      // Fill to capacity
      for (let i = 0; i < 20; i++) {
        expect(manager.enqueue(createEntry({ id: `entry-${i}` }))).toBe(true);
      }

      // 21st should fail
      const result = manager.enqueue(createEntry({ id: 'overflow' }));
      expect(result).toBe(false);
      expect(manager.size).toBe(20);
    });

    it('should persist entries to localStorage', () => {
      manager.enqueue(createEntry({ id: 'persisted' }));

      const raw = storage.getItem('offline_queue');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('persisted');
    });
  });

  describe('dequeue', () => {
    it('should return undefined for empty queue', () => {
      expect(manager.dequeue()).toBeUndefined();
    });

    it('should remove and return the oldest entry (FIFO)', () => {
      manager.enqueue(createEntry({ id: 'first' }));
      manager.enqueue(createEntry({ id: 'second' }));

      const dequeued = manager.dequeue();
      expect(dequeued?.id).toBe('first');
      expect(manager.size).toBe(1);
      expect(manager.getQueue()[0].id).toBe('second');
    });
  });

  describe('getQueue', () => {
    it('should return empty array when no queue exists', () => {
      expect(manager.getQueue()).toEqual([]);
    });

    it('should return empty array for corrupted localStorage data', () => {
      storage.setItem('offline_queue', 'not valid json');
      expect(manager.getQueue()).toEqual([]);
    });

    it('should return all entries without modifying the queue', () => {
      manager.enqueue(createEntry({ id: 'a' }));
      manager.enqueue(createEntry({ id: 'b' }));

      const queue1 = manager.getQueue();
      const queue2 = manager.getQueue();
      expect(queue1).toHaveLength(2);
      expect(queue2).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should remove all entries from the queue', () => {
      manager.enqueue(createEntry());
      manager.enqueue(createEntry());

      manager.clear();
      expect(manager.size).toBe(0);
      expect(storage.getItem('offline_queue')).toBeNull();
    });
  });

  describe('syncOnReconnect', () => {
    it('should process all entries in order on successful sync', async () => {
      manager.enqueue(createEntry({ id: 'sync-1', endpoint: '/api/1' }));
      manager.enqueue(createEntry({ id: 'sync-2', endpoint: '/api/2' }));

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await manager.syncOnReconnect(mockFetch);

      expect(result.succeeded).toEqual(['sync-1', 'sync-2']);
      expect(result.failed).toEqual([]);
      expect(manager.size).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry failed entries and keep them in queue', async () => {
      manager.enqueue(createEntry({ id: 'fail-1', endpoint: '/api/fail', retryCount: 0 }));

      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      const result = await manager.syncOnReconnect(mockFetch);

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toEqual([]);
      // Entry should still be in queue with incremented retryCount
      expect(manager.size).toBe(1);
      expect(manager.getQueue()[0].retryCount).toBe(1);
    });

    it('should remove entries after exceeding MAX_RETRY_COUNT (3)', async () => {
      manager.enqueue(createEntry({ id: 'max-retry', retryCount: 3 }));

      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      const result = await manager.syncOnReconnect(mockFetch);

      expect(result.failed).toEqual(['max-retry']);
      expect(manager.size).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      manager.enqueue(createEntry({ id: 'net-err', retryCount: 0 }));

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await manager.syncOnReconnect(mockFetch);

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(manager.size).toBe(1);
      expect(manager.getQueue()[0].retryCount).toBe(1);
    });

    it('should return empty result for empty queue', async () => {
      const mockFetch = vi.fn();
      const result = await manager.syncOnReconnect(mockFetch);

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(manager.size).toBe(0);
    });

    it('should reflect current queue length', () => {
      manager.enqueue(createEntry());
      expect(manager.size).toBe(1);
      manager.enqueue(createEntry());
      expect(manager.size).toBe(2);
      manager.dequeue();
      expect(manager.size).toBe(1);
    });
  });
});
