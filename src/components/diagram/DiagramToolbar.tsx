"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

interface DiagramToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  layoutOrientation: "horizontal" | "vertical";
  onLayoutChange: (orientation: "horizontal" | "vertical") => void;
  /** Whether undo is available */
  canUndo?: boolean;
  /** Whether redo is available */
  canRedo?: boolean;
  /** Undo callback */
  onUndo?: () => void;
  /** Redo callback */
  onRedo?: () => void;
  /** Regenerate diagram callback (shows button when provided) */
  onRegenerate?: () => void;
}

/**
 * Toolbar displayed above the diagram canvas with zoom controls
 * and layout orientation toggle.
 */
export function DiagramToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  layoutOrientation,
  onLayoutChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onRegenerate,
}: DiagramToolbarProps) {
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div
      className="flex items-center gap-1 border-b border-border bg-background px-3 py-1.5"
      role="toolbar"
      aria-label="Diagram controls"
    >
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
          className="h-8 w-8 p-0"
        >
          <MinusIcon className="h-4 w-4" />
        </Button>

        <span
          className="min-w-[3.5rem] text-center text-sm tabular-nums text-muted-foreground"
          aria-live="polite"
          aria-label={`Zoom level: ${zoomPercentage}%`}
        >
          {zoomPercentage}%
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
          className="h-8 w-8 p-0"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToScreen}
          aria-label="Fit diagram to screen"
          title="Fit to screen"
          className="h-8 px-2 text-xs"
        >
          <FitIcon className="mr-1 h-3.5 w-3.5" />
          Fit
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onResetZoom}
          aria-label="Reset zoom to 100%"
          title="Reset zoom (100%)"
          className="h-8 px-2 text-xs"
        >
          100%
        </Button>
      </div>

      <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />

      {/* Layout orientation */}
      <div className="flex items-center gap-1">
        <Button
          variant={layoutOrientation === "horizontal" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onLayoutChange("horizontal")}
          aria-label="Horizontal layout"
          aria-pressed={layoutOrientation === "horizontal"}
          title="Horizontal layout (left to right)"
          className="h-8 w-8 p-0"
        >
          <HorizontalLayoutIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={layoutOrientation === "vertical" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onLayoutChange("vertical")}
          aria-label="Vertical layout"
          aria-pressed={layoutOrientation === "vertical"}
          title="Vertical layout (top to bottom)"
          className="h-8 w-8 p-0"
        >
          <VerticalLayoutIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Undo/Redo controls */}
      {(onUndo || onRedo) && (
        <>
          <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo (Ctrl+Z)"
              title="Undo (Ctrl+Z)"
              className="h-8 w-8 p-0"
            >
              <UndoIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo (Ctrl+Y)"
              title="Redo (Ctrl+Y)"
              className="h-8 w-8 p-0"
            >
              <RedoIcon className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Regenerate button */}
      {onRegenerate && (
        <>
          <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            aria-label="Regenerate diagram from prompt"
            title="Regenerate diagram"
            className="h-8 px-2 text-xs"
          >
            <RegenerateIcon className="mr-1 h-3.5 w-3.5" />
            Regenerate
          </Button>
        </>
      )}
    </div>
  );
}

// --- Simple inline SVG icons ---

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FitIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function HorizontalLayoutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="7" width="6" height="10" rx="1" />
      <rect x="16" y="7" width="6" height="10" rx="1" />
      <path d="M8 12h8" />
      <path d="M13 9l3 3-3 3" />
    </svg>
  );
}

function VerticalLayoutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="7" y="2" width="10" height="6" rx="1" />
      <rect x="7" y="16" width="10" height="6" rx="1" />
      <path d="M12 8v8" />
      <path d="M9 13l3 3 3-3" />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
  );
}

function RegenerateIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
