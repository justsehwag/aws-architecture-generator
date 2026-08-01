"use client";

import * as React from "react";
import { useDiagram } from "./DiagramContext";
import type { DiagramNode, DiagramEdge } from "@/lib/diagram-engine/xml-parser";

/**
 * Tracks the state of an in-progress edge drawing operation.
 */
export interface EdgeDrawingState {
  /** The source node being dragged from */
  sourceNodeId: string;
  /** Current mouse position (endpoint of the temporary line) */
  currentX: number;
  currentY: number;
  /** The node currently being hovered as a potential target */
  targetNodeId: string | null;
}

interface EdgeDrawerProps {
  /** All nodes in the diagram (used for hit testing) */
  nodes: DiagramNode[];
  /** Current transform scale for coordinate conversion */
  scale: number;
  /** Current translate offset X */
  translateX: number;
  /** Current translate offset Y */
  translateY: number;
}

/**
 * EdgeDrawer manages the logic for creating edges between diagram nodes.
 *
 * Interaction: Hold Shift and drag from one node to another.
 * - A temporary SVG line is drawn from the source node center to the mouse.
 * - When the mouse is released over a valid target node, a new edge is created.
 * - Visual feedback: potential target nodes get a highlighted border.
 * - Cancel via Escape key or releasing over empty space.
 *
 * Requirement 3.5: WHEN the user draws an edge from one node to another,
 * THE Diagram_Viewer SHALL create a visible connection between the two nodes.
 */
export function useEdgeDrawer({ nodes, scale, translateX, translateY }: EdgeDrawerProps) {
  const { addEdge } = useDiagram();
  const [drawingState, setDrawingState] = React.useState<EdgeDrawingState | null>(null);

  /**
   * Begin edge drawing when Shift+mousedown occurs on a node.
   */
  const startEdgeDrawing = React.useCallback(
    (sourceNodeId: string, clientX: number, clientY: number) => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      // Convert client coords to canvas coords
      const canvasX = (clientX - translateX) / scale;
      const canvasY = (clientY - translateY) / scale;

      setDrawingState({
        sourceNodeId,
        currentX: canvasX,
        currentY: canvasY,
        targetNodeId: null,
      });
    },
    [nodes, scale, translateX, translateY]
  );

  /**
   * Update the temporary line endpoint and check for target node hover.
   */
  const updateEdgeDrawing = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!drawingState) return;

      const canvasX = (clientX - translateX) / scale;
      const canvasY = (clientY - translateY) / scale;

      // Hit test against all nodes (except the source)
      const targetNode = nodes.find((node) => {
        if (node.id === drawingState.sourceNodeId) return false;
        return (
          canvasX >= node.x &&
          canvasX <= node.x + node.width &&
          canvasY >= node.y &&
          canvasY <= node.y + node.height
        );
      });

      setDrawingState((prev) =>
        prev
          ? {
              ...prev,
              currentX: canvasX,
              currentY: canvasY,
              targetNodeId: targetNode?.id ?? null,
            }
          : null
      );
    },
    [drawingState, nodes, scale, translateX, translateY]
  );

  /**
   * Complete edge drawing: create the edge if released over a valid target.
   */
  const finishEdgeDrawing = React.useCallback(() => {
    if (!drawingState) return;

    if (drawingState.targetNodeId) {
      const newEdge: DiagramEdge = {
        id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourceId: drawingState.sourceNodeId,
        targetId: drawingState.targetNodeId,
        label: "",
        style: "edgeStyle=orthogonalEdgeStyle;rounded=1;",
      };
      addEdge(newEdge);
    }

    setDrawingState(null);
  }, [drawingState, addEdge]);

  /**
   * Cancel the edge drawing operation.
   */
  const cancelEdgeDrawing = React.useCallback(() => {
    setDrawingState(null);
  }, []);

  // Handle Escape key to cancel
  React.useEffect(() => {
    if (!drawingState) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelEdgeDrawing();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingState, cancelEdgeDrawing]);

  return {
    drawingState,
    startEdgeDrawing,
    updateEdgeDrawing,
    finishEdgeDrawing,
    cancelEdgeDrawing,
    isDrawingEdge: drawingState !== null,
  };
}

// --- Temporary Edge Line Renderer ---

interface TempEdgeLineProps {
  drawingState: EdgeDrawingState;
  nodes: DiagramNode[];
}

/**
 * Renders the temporary SVG line during edge creation,
 * from the source node center to the current mouse position.
 */
export function TempEdgeLine({ drawingState, nodes }: TempEdgeLineProps) {
  const sourceNode = nodes.find((n) => n.id === drawingState.sourceNodeId);
  if (!sourceNode) return null;

  const sx = sourceNode.x + sourceNode.width / 2;
  const sy = sourceNode.y + sourceNode.height / 2;

  return (
    <line
      x1={sx}
      y1={sy}
      x2={drawingState.currentX}
      y2={drawingState.currentY}
      stroke="hsl(var(--primary))"
      strokeWidth={2}
      strokeDasharray="6 3"
      opacity={0.8}
      pointerEvents="none"
    />
  );
}

// --- Target Highlight Renderer ---

interface TargetHighlightProps {
  targetNodeId: string;
  nodes: DiagramNode[];
}

/**
 * Renders a highlighted border around a potential edge target node
 * during edge drawing.
 */
export function TargetHighlight({ targetNodeId, nodes }: TargetHighlightProps) {
  const targetNode = nodes.find((n) => n.id === targetNodeId);
  if (!targetNode) return null;

  return (
    <rect
      x={targetNode.x - 4}
      y={targetNode.y - 4}
      width={targetNode.width + 8}
      height={targetNode.height + 8}
      rx={6}
      ry={6}
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth={2.5}
      opacity={0.7}
      pointerEvents="none"
      className="animate-pulse"
    />
  );
}
