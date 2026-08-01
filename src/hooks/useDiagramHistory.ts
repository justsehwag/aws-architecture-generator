import { useCallback, useEffect, useRef } from "react";
import type { DiagramNode, DiagramEdge } from "@/lib/diagram-engine/xml-parser";
import { useUndoRedo } from "./useUndoRedo";

/**
 * A snapshot of the diagram state for undo/redo history.
 */
export interface DiagramSnapshot {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface UseDiagramHistoryReturn {
  /** Whether an undo operation is available */
  canUndo: boolean;
  /** Whether a redo operation is available */
  canRedo: boolean;
  /** Undo the most recent edit */
  undo: () => DiagramSnapshot | undefined;
  /** Redo a previously undone edit */
  redo: () => DiagramSnapshot | undefined;
  /** Record the current state before an edit operation */
  recordSnapshot: (snapshot: DiagramSnapshot) => void;
  /** Reset history (e.g., when loading a new diagram) */
  resetHistory: (snapshot: DiagramSnapshot) => void;
}

/**
 * Integrates the generic useUndoRedo hook with diagram state (nodes + edges).
 *
 * Usage:
 * - Call `recordSnapshot({ nodes, edges })` before each edit operation
 *   (move, delete, add, rename, layout change)
 * - Call `undo()` / `redo()` to navigate history — returns the state to restore
 * - Keyboard shortcuts (Ctrl+Z / Ctrl+Y, Cmd+Z / Cmd+Y) are handled automatically
 *
 * @param currentSnapshot The current diagram state (nodes + edges)
 * @param onRestore Callback invoked with the snapshot to restore on undo/redo
 */
export function useDiagramHistory(
  currentSnapshot: DiagramSnapshot,
  onRestore: (snapshot: DiagramSnapshot) => void
): UseDiagramHistoryReturn {
  const { canUndo, canRedo, present, push, undo, redo, reset } =
    useUndoRedo<DiagramSnapshot>(currentSnapshot);

  // Track whether we're restoring to avoid recording the restore as an edit
  const isRestoringRef = useRef(false);

  const recordSnapshot = useCallback(
    (snapshot: DiagramSnapshot) => {
      if (isRestoringRef.current) return;
      push(snapshot);
    },
    [push]
  );

  const handleUndo = useCallback((): DiagramSnapshot | undefined => {
    if (!canUndo) return undefined;
    isRestoringRef.current = true;
    undo();
    // The present state after undo is what we need — but since state updates
    // are async in React, we read directly from the hook's present after undo.
    // We'll use effect to trigger onRestore.
    return undefined;
  }, [canUndo, undo]);

  const handleRedo = useCallback((): DiagramSnapshot | undefined => {
    if (!canRedo) return undefined;
    isRestoringRef.current = true;
    redo();
    return undefined;
  }, [canRedo, redo]);

  // When present changes due to undo/redo, restore the diagram
  const prevPresentRef = useRef(present);
  useEffect(() => {
    if (prevPresentRef.current !== present && isRestoringRef.current) {
      onRestore(present);
      isRestoringRef.current = false;
    }
    prevPresentRef.current = present;
  }, [present, onRestore]);

  const resetHistory = useCallback(
    (snapshot: DiagramSnapshot) => {
      reset(snapshot);
    },
    [reset]
  );

  // Keyboard shortcut handler for Ctrl+Z / Ctrl+Y (and Cmd on Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    canUndo,
    canRedo,
    undo: handleUndo,
    redo: handleRedo,
    recordSnapshot,
    resetHistory,
  };
}
