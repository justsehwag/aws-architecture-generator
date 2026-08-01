"use client";

import * as React from "react";

export interface InlineEditorProps {
  /** Current label value to edit */
  value: string;
  /** Position of the node being edited (in SVG coordinates) */
  position: { x: number; y: number; width: number; height: number };
  /** Current canvas transform for positioning the overlay */
  transform: { translateX: number; translateY: number; scale: number };
  /** Called with the new label when the user confirms (Enter) */
  onConfirm: (newLabel: string) => void;
  /** Called when the user cancels editing (Escape or blur) */
  onCancel: () => void;
}

/**
 * Inline text input overlay positioned over a node for label editing.
 * Appears on double-click, confirms on Enter, cancels on Escape.
 *
 * Requirement 3.4: Present an inline text field pre-filled with the current
 * label, allowing the user to rename and confirm by pressing Enter or cancel
 * by pressing Escape.
 */
export function InlineEditor({
  value,
  position,
  transform,
  onConfirm,
  onCancel,
}: InlineEditorProps) {
  const [editValue, setEditValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus and select all text on mount
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = editValue.trim();
        if (trimmed.length > 0) {
          onConfirm(trimmed);
        } else {
          onCancel();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [editValue, onConfirm, onCancel]
  );

  const handleBlur = React.useCallback(() => {
    // Treat blur as cancel to avoid accidental edits
    onCancel();
  }, [onCancel]);

  // Calculate screen position from SVG coordinates + transform
  const left = position.x * transform.scale + transform.translateX;
  const top = position.y * transform.scale + transform.translateY;
  const width = position.width * transform.scale;
  const height = position.height * transform.scale;

  return (
    <div
      className="absolute z-50"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      // Prevent clicks from propagating to canvas (which would deselect)
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-[90%] rounded border border-primary bg-background px-1.5 py-0.5 text-center text-xs text-foreground shadow-sm outline-none ring-2 ring-primary/30"
        style={{ fontSize: `${Math.max(11 * transform.scale, 10)}px` }}
        aria-label="Edit node label"
      />
    </div>
  );
}
