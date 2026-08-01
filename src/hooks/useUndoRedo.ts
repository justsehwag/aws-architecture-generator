import { useCallback, useRef, useState } from "react";

/**
 * Maximum number of past states to retain in the undo history.
 */
const MAX_HISTORY_SIZE = 50;

export interface UndoRedoState<T> {
  /** Whether an undo operation is available */
  canUndo: boolean;
  /** Whether a redo operation is available */
  canRedo: boolean;
  /** The current state */
  present: T;
  /** Push a new state onto the history stack */
  push: (state: T) => void;
  /** Undo the most recent change */
  undo: () => void;
  /** Redo a previously undone change */
  redo: () => void;
  /** Reset history, keeping only the given state as present */
  reset: (state: T) => void;
}

/**
 * Generic undo/redo hook that manages a history stack of state snapshots.
 *
 * - Maintains: past[] (up to 50 entries), present (current state), future[] (for redo)
 * - push(state): Adds current state to past, sets new state as present, clears future
 * - undo(): Moves present to future, pops past to present
 * - redo(): Moves present to past, pops future to present
 * - Limits past stack to MAX_HISTORY_SIZE entries (drops oldest when exceeded)
 */
export function useUndoRedo<T>(initialState: T): UndoRedoState<T> {
  const [present, setPresent] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [, forceRender] = useState(0);

  const push = useCallback((newState: T) => {
    setPresent((currentPresent) => {
      pastRef.current = [...pastRef.current, currentPresent];
      // Drop oldest entries when limit exceeded
      if (pastRef.current.length > MAX_HISTORY_SIZE) {
        pastRef.current = pastRef.current.slice(
          pastRef.current.length - MAX_HISTORY_SIZE
        );
      }
      // Clear future on new push
      futureRef.current = [];
      return newState;
    });
    forceRender((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    setPresent((currentPresent) => {
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [currentPresent, ...futureRef.current];
      return previous;
    });
    forceRender((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    setPresent((currentPresent) => {
      const next = futureRef.current[0];
      futureRef.current = futureRef.current.slice(1);
      pastRef.current = [...pastRef.current, currentPresent];
      return next;
    });
    forceRender((n) => n + 1);
  }, []);

  const reset = useCallback((state: T) => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(state);
    forceRender((n) => n + 1);
  }, []);

  return {
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    present,
    push,
    undo,
    redo,
    reset,
  };
}
