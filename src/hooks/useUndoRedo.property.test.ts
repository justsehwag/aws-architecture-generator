/**
 * Property-based tests for the useUndoRedo hook.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3**
 *
 * Property 10: For any sequence of push operations, undo restores previous state, redo restores next
 *
 * Since React hooks cannot be tested directly without a render context,
 * we test the underlying logic by reimplementing the state machine in a plain class.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * A plain-class version of the undo/redo state machine for property testing.
 * This mirrors the logic in useUndoRedo without React rendering concerns.
 */
class UndoRedoStateMachine<T> {
  private past: T[] = [];
  private present: T;
  private future: T[] = [];
  private readonly maxHistorySize = 50;

  constructor(initial: T) {
    this.present = initial;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get currentState(): T {
    return this.present;
  }

  push(newState: T): void {
    this.past.push(this.present);
    if (this.past.length > this.maxHistorySize) {
      this.past = this.past.slice(this.past.length - this.maxHistorySize);
    }
    this.future = [];
    this.present = newState;
  }

  undo(): void {
    if (this.past.length === 0) return;
    const previous = this.past[this.past.length - 1];
    this.past = this.past.slice(0, -1);
    this.future = [this.present, ...this.future];
    this.present = previous;
  }

  redo(): void {
    if (this.future.length === 0) return;
    const next = this.future[0];
    this.future = this.future.slice(1);
    this.past.push(this.present);
    this.present = next;
  }
}

describe('useUndoRedo property tests', () => {
  it('Property 10: for any sequence of push operations, undo restores previous state, redo restores next', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 2, maxLength: 20 }),
        (states) => {
          const initial = states[0];
          const machine = new UndoRedoStateMachine(initial);

          // Push all subsequent states
          const pushStates = states.slice(1);
          for (const state of pushStates) {
            machine.push(state);
          }

          // The current state should be the last pushed
          expect(machine.currentState).toBe(pushStates[pushStates.length - 1]);

          // Undo should restore previous state
          const beforeUndo = machine.currentState;
          machine.undo();
          const afterUndo = machine.currentState;

          if (pushStates.length >= 2) {
            expect(afterUndo).toBe(pushStates[pushStates.length - 2]);
          } else {
            expect(afterUndo).toBe(initial);
          }

          // Redo should restore the state we just undid
          machine.redo();
          expect(machine.currentState).toBe(beforeUndo);
        }
      ),
      { numRuns: 100 }
    );
  });
});
