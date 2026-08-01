/**
 * Property-based tests for OfflineQueueManager.
 *
 * **Validates: Requirements 13.2**
 *
 * Property 26: Queue accepts up to 20 entries then rejects further additions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { OfflineQueueManager, type OfflineQueueEntry } from './OfflineQueueManager';

/**
 * In-memory storage that mimics localStorage for testing.
 */
class InMemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

/**
 * Arbitrary for generating a valid OfflineQueueEntry.
 */
const queueEntryArb = (index: number): fc.Arbitrary<OfflineQueueEntry> =>
  fc.record({
    id: fc.constant(`entry-${index}-${Date.now()}`),
    timestamp: fc.constant(new Date().toISOString()),
    action: fc.constantFrom('save' as const, 'autosave' as const, 'export' as const, 'delete' as const),
    endpoint: fc.constant(`/api/test/${index}`),
    payload: fc.constant({ data: `payload-${index}` }),
    retryCount: fc.constant(0),
  });

describe('OfflineQueueManager property tests', () => {
  let storage: InMemoryStorage;
  let manager: OfflineQueueManager;

  beforeEach(() => {
    storage = new InMemoryStorage();
    manager = new OfflineQueueManager(storage);
  });

  it('Property 26: queue accepts up to 20 entries then rejects further additions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 21, max: 40 }),
        (totalAttempts) => {
          // Reset for each run
          storage.clear();
          const localManager = new OfflineQueueManager(storage);

          let accepted = 0;
          let rejected = 0;

          for (let i = 0; i < totalAttempts; i++) {
            const entry: OfflineQueueEntry = {
              id: `entry-${i}`,
              timestamp: new Date().toISOString(),
              action: 'save',
              endpoint: `/api/test/${i}`,
              payload: { data: i },
              retryCount: 0,
            };

            const result = localManager.enqueue(entry);
            if (result) {
              accepted++;
            } else {
              rejected++;
            }
          }

          // Exactly 20 should be accepted
          expect(accepted).toBe(20);
          // The rest should be rejected
          expect(rejected).toBe(totalAttempts - 20);
          // Queue size should be exactly 20
          expect(localManager.size).toBe(20);
        }
      ),
      { numRuns: 100 }
    );
  });
});
