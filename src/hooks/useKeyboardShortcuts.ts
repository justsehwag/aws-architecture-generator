"use client";

import { useCallback, useEffect } from "react";

/**
 * Options for registering keyboard shortcuts on the diagram canvas.
 */
export interface KeyboardShortcutHandlers {
  /** Called when Ctrl+Z (undo) is pressed */
  onUndo?: () => void;
  /** Called when Ctrl+Y or Ctrl+Shift+Z (redo) is pressed */
  onRedo?: () => void;
  /** Whether shortcuts are active (disable when editing inline, etc.) */
  enabled?: boolean;
  /** Optional ref to a container element — if provided, shortcuts only fire
   * when that element or its descendants have focus. If omitted, shortcuts
   * are registered globally on the document. */
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Hook that listens for undo/redo keyboard shortcuts:
 * - Ctrl+Z (Cmd+Z on Mac) → undo
 * - Ctrl+Y (Cmd+Y on Mac) or Ctrl+Shift+Z (Cmd+Shift+Z on Mac) → redo
 *
 * Prevents default browser behaviour for these combos when the diagram
 * canvas (or specified container) is focused.
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onUndo: () => undoRedoState.undo(),
 *   onRedo: () => undoRedoState.redo(),
 *   enabled: !isEditing,
 *   containerRef: canvasRef,
 * });
 * ```
 */
export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  enabled = true,
  containerRef,
}: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if the container has focus (or a descendant)
      if (containerRef?.current) {
        const container = containerRef.current;
        if (
          !container.contains(document.activeElement) &&
          document.activeElement !== container
        ) {
          return;
        }
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      if (!isCtrlOrCmd) return;

      // Ctrl+Shift+Z → redo
      if (event.key === "Z" && event.shiftKey) {
        event.preventDefault();
        onRedo?.();
        return;
      }

      // Ctrl+Z → undo
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        onUndo?.();
        return;
      }

      // Ctrl+Y → redo
      if (event.key === "y" && !event.shiftKey) {
        event.preventDefault();
        onRedo?.();
        return;
      }
    },
    [enabled, onUndo, onRedo, containerRef]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
