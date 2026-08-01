"use client";

import * as React from "react";
import { usePanZoom } from "@/hooks/usePanZoom";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDiagram } from "./DiagramContext";
import { DiagramToolbar } from "./DiagramToolbar";
import { InlineEditor } from "./InlineEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import { useEdgeDrawer, TempEdgeLine, TargetHighlight } from "./EdgeDrawer";
import { useLayoutReflow } from "@/hooks/useLayoutReflow";
import type { DiagramNode, DiagramEdge } from "@/lib/diagram-engine/xml-parser";

interface DiagramCanvasProps {
  /** .drawio XML string to render */
  xml?: string;
  /** Optional CSS class for the outer wrapper */
  className?: string;
  /** Callback to regenerate the diagram from a modified prompt.
   *  When provided, a "Regenerate" button appears in the toolbar.
   *  A confirmation dialog is shown before executing (Requirement 3.9). */
  onRegenerate?: () => void;
}

/**
 * Interactive diagram canvas that renders .drawio XML content
 * with pan/zoom support. Renders nodes as SVG rectangles with labels
 * and edges as SVG paths between nodes.
 *
 * Requirement 3.1: Render .drawio diagram in a pannable and zoomable
 * canvas within 3 seconds for diagrams containing up to 200 nodes.
 */
export function DiagramCanvas({ xml, className, onRegenerate }: DiagramCanvasProps) {
  const {
    state,
    setDiagram,
    selectNode,
    deselectAll,
    updateNodePosition,
    deleteNode,
    updateNodeLabel,
    restoreSnapshot,
  } = useDiagram();

  const {
    transform,
    containerRef,
    handleMouseDown: panMouseDown,
    handleMouseMove: panMouseMove,
    handleMouseUp: panMouseUp,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    isPanning,
  } = usePanZoom({ minScale: 0.1, maxScale: 5, zoomStep: 0.1 });

  // --- Drag state ---
  const [dragging, setDragging] = React.useState<{
    nodeId: string;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
  } | null>(null);

  // --- Inline editor state ---
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);

  // --- Edge drawing hook ---
  const {
    drawingState,
    startEdgeDrawing,
    updateEdgeDrawing,
    finishEdgeDrawing,
    // cancelEdgeDrawing is handled internally by the hook via Escape key listener
    isDrawingEdge,
  } = useEdgeDrawer({
    nodes: state.nodes,
    scale: transform.scale,
    translateX: transform.translateX,
    translateY: transform.translateY,
  });

  // --- Layout reflow hook ---
  const { reflowLayout } = useLayoutReflow();

  // --- Undo/Redo state ---
  type DiagramSnapshot = { nodes: DiagramNode[]; edges: DiagramEdge[] };

  const undoRedo = useUndoRedo<DiagramSnapshot>({
    nodes: state.nodes,
    edges: state.edges,
  });

  // Track whether the current state change was triggered by undo/redo
  const isUndoRedoRef = React.useRef(false);
  const prevNodesRef = React.useRef(state.nodes);
  const prevEdgesRef = React.useRef(state.edges);

  // Push to undo stack when nodes or edges change from user edit actions
  React.useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      prevNodesRef.current = state.nodes;
      prevEdgesRef.current = state.edges;
      return;
    }

    const nodesChanged = prevNodesRef.current !== state.nodes;
    const edgesChanged = prevEdgesRef.current !== state.edges;

    if (nodesChanged || edgesChanged) {
      undoRedo.push({ nodes: state.nodes, edges: state.edges });
      prevNodesRef.current = state.nodes;
      prevEdgesRef.current = state.edges;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nodes, state.edges]);

  const handleUndo = React.useCallback(() => {
    if (!undoRedo.canUndo) return;
    isUndoRedoRef.current = true;
    undoRedo.undo();
  }, [undoRedo]);

  const handleRedo = React.useCallback(() => {
    if (!undoRedo.canRedo) return;
    isUndoRedoRef.current = true;
    undoRedo.redo();
  }, [undoRedo]);

  // Sync undo/redo present state back into diagram context
  const lastRestoredRef = React.useRef(undoRedo.present);
  React.useEffect(() => {
    const snapshot = undoRedo.present;
    if (snapshot !== lastRestoredRef.current) {
      lastRestoredRef.current = snapshot;
      if (snapshot.nodes !== state.nodes || snapshot.edges !== state.edges) {
        restoreSnapshot(snapshot.nodes, snapshot.edges);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoRedo.present, restoreSnapshot]);

  // --- Keyboard shortcuts (Ctrl+Z / Ctrl+Y) ---
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    enabled: !editingNodeId,
    containerRef: containerRef as React.RefObject<HTMLElement | null>,
  });

  // --- Layout reflow handler ---
  const handleLayoutChange = React.useCallback(
    (orientation: "horizontal" | "vertical") => {
      reflowLayout(orientation);
    },
    [reflowLayout]
  );

  // --- Confirm dialog state ---
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    onConfirm: () => {},
  });

  // Set diagram XML when prop changes
  React.useEffect(() => {
    if (xml && xml !== state.xml) {
      setDiagram(xml);
    }
  }, [xml, state.xml, setDiagram]);

  // Compute content bounding box for fit-to-screen
  const contentBounds = React.useMemo(() => {
    if (state.nodes.length === 0) {
      return { width: 800, height: 600 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of state.nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    return {
      width: maxX - minX + 100,
      height: maxY - minY + 100,
    };
  }, [state.nodes]);

  const handleFitToScreen = React.useCallback(() => {
    fitToScreen(contentBounds.width, contentBounds.height);
  }, [fitToScreen, contentBounds]);

  // --- Regenerate handler ---
  const handleRegenerate = React.useCallback(() => {
    if (!onRegenerate) return;
    setConfirmDialog({
      open: true,
      title: "Regenerate Diagram",
      description:
        "Are you sure you want to regenerate the diagram? The current diagram will be discarded and a new one will be generated from the updated prompt.",
      confirmLabel: "Regenerate",
      onConfirm: () => {
        onRegenerate();
      },
    });
  }, [onRegenerate]);

  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Deselect when clicking canvas background
      if ((e.target as HTMLElement).dataset?.canvasBg === "true") {
        deselectAll();
      }
    },
    [deselectAll]
  );

  // --- Node drag handlers ---

  const handleNodeMouseDown = React.useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      // Only left button for drag
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      // Shift+drag starts edge drawing
      if (e.shiftKey) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          startEdgeDrawing(nodeId, e.clientX - rect.left, e.clientY - rect.top);
        }
        return;
      }

      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      selectNode(nodeId);
      setDragging({
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        nodeStartX: node.x,
        nodeStartY: node.y,
      });
    },
    [state.nodes, selectNode, startEdgeDrawing, containerRef]
  );

  const handleCanvasMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (isDrawingEdge) {
        // Update the temporary edge line position
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          updateEdgeDrawing(e.clientX - rect.left, e.clientY - rect.top);
        }
      } else if (dragging) {
        // Calculate delta in canvas coordinates (account for scale)
        const dx = (e.clientX - dragging.startX) / transform.scale;
        const dy = (e.clientY - dragging.startY) / transform.scale;
        updateNodePosition(
          dragging.nodeId,
          dragging.nodeStartX + dx,
          dragging.nodeStartY + dy
        );
      } else {
        panMouseMove(e);
      }
    },
    [isDrawingEdge, dragging, transform.scale, updateNodePosition, panMouseMove, updateEdgeDrawing, containerRef]
  );

  const handleCanvasMouseUp = React.useCallback(() => {
    if (isDrawingEdge) {
      finishEdgeDrawing();
    } else if (dragging) {
      setDragging(null);
    } else {
      panMouseUp();
    }
  }, [isDrawingEdge, finishEdgeDrawing, dragging, panMouseUp]);

  const handleCanvasMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      // Only start panning if not dragging a node
      if (!dragging) {
        panMouseDown(e);
      }
    },
    [dragging, panMouseDown]
  );

  // --- Double-click for inline editing ---

  const handleNodeDoubleClick = React.useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      e.preventDefault();
      setEditingNodeId(nodeId);
    },
    []
  );

  const handleLabelConfirm = React.useCallback(
    (newLabel: string) => {
      if (editingNodeId) {
        updateNodeLabel(editingNodeId, newLabel);
      }
      setEditingNodeId(null);
    },
    [editingNodeId, updateNodeLabel]
  );

  const handleLabelCancel = React.useCallback(() => {
    setEditingNodeId(null);
  }, []);

  // --- Keyboard handler for Delete key ---

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      // Don't handle keys if inline editor is open
      if (editingNodeId) return;

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectedNodeId
      ) {
        e.preventDefault();
        const node = state.nodes.find((n) => n.id === state.selectedNodeId);
        const nodeName = node?.label || "this node";
        const connectedEdges = state.edges.filter(
          (edge) =>
            edge.sourceId === state.selectedNodeId ||
            edge.targetId === state.selectedNodeId
        );

        setConfirmDialog({
          open: true,
          title: "Delete Node",
          description: `Are you sure you want to delete "${nodeName}"? This will also remove ${connectedEdges.length} connected edge${connectedEdges.length !== 1 ? "s" : ""}.`,
          confirmLabel: "Delete",
          onConfirm: () => {
            deleteNode(state.selectedNodeId!);
          },
        });
      }
    },
    [editingNodeId, state.selectedNodeId, state.nodes, state.edges, deleteNode]
  );

  // --- Get editing node data ---
  const editingNode = editingNodeId
    ? state.nodes.find((n) => n.id === editingNodeId)
    : null;

  // Empty state
  if (!state.xml && !xml) {
    return (
      <div
        className={`flex h-full w-full flex-col ${className || ""}`}
        role="region"
        aria-label="Diagram canvas"
      >
        <DiagramToolbar
          zoom={transform.scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onFitToScreen={handleFitToScreen}
          layoutOrientation={state.layoutOrientation}
          onLayoutChange={handleLayoutChange}
          canUndo={undoRedo.canUndo}
          canRedo={undoRedo.canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onRegenerate={onRegenerate ? handleRegenerate : undefined}
        />
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <div className="text-center text-muted-foreground">
            <EmptyDiagramIcon className="mx-auto mb-3 h-16 w-16 opacity-40" />
            <p className="text-lg font-medium">No diagram</p>
            <p className="text-sm">
              Generate or import a diagram to view it here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col ${className || ""}`}
      role="region"
      aria-label="Diagram canvas"
    >
      <DiagramToolbar
        zoom={transform.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onFitToScreen={handleFitToScreen}
        layoutOrientation={state.layoutOrientation}
        onLayoutChange={handleLayoutChange}
        canUndo={undoRedo.canUndo}
        canRedo={undoRedo.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRegenerate={onRegenerate ? handleRegenerate : undefined}
      />
      <div
        ref={containerRef}
        className={`relative flex-1 overflow-hidden bg-muted/20 ${
          dragging
            ? "cursor-grabbing"
            : isPanning
              ? "cursor-grabbing"
              : "cursor-grab"
        }`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        onKeyDown={handleKeyDown}
        data-canvas-bg="true"
        tabIndex={0}
        aria-label={`Architecture diagram with ${state.nodes.length} nodes and ${state.edges.length} connections`}
      >
        {/* Grid background pattern */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
            backgroundPosition: `${transform.translateX}px ${transform.translateY}px`,
          }}
          aria-hidden="true"
        />

        {/* SVG Canvas */}
        <svg
          className="absolute inset-0 h-full w-full"
          style={{
            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
          data-canvas-bg="true"
        >
          {/* Arrowhead marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="hsl(var(--muted-foreground))"
              />
            </marker>
          </defs>

          {/* Render edges first (below nodes) */}
          {state.edges.map((edge) => (
            <EdgeRenderer
              key={edge.id}
              edge={edge}
              nodes={state.nodes}
              isSelected={state.selectedEdgeId === edge.id}
            />
          ))}

          {/* Temporary edge line while drawing */}
          {drawingState && (
            <TempEdgeLine drawingState={drawingState} nodes={state.nodes} />
          )}

          {/* Target highlight while drawing edge */}
          {drawingState?.targetNodeId && (
            <TargetHighlight targetNodeId={drawingState.targetNodeId} nodes={state.nodes} />
          )}

          {/* Render nodes */}
          {state.nodes.map((node) => (
            <NodeRenderer
              key={node.id}
              node={node}
              isSelected={state.selectedNodeId === node.id}
              isDragging={dragging?.nodeId === node.id}
              isEditing={editingNodeId === node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onSelect={() => selectNode(node.id)}
            />
          ))}
        </svg>

        {/* Inline editor overlay (positioned in screen coordinates) */}
        {editingNode && (
          <InlineEditor
            value={editingNode.label}
            position={{
              x: editingNode.x,
              y: editingNode.y,
              width: editingNode.width,
              height: editingNode.height,
            }}
            transform={transform}
            onConfirm={handleLabelConfirm}
            onCancel={handleLabelCancel}
          />
        )}
      </div>

      {/* Confirm dialog for destructive actions */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}

// --- Node Renderer ---

interface NodeRendererProps {
  node: DiagramNode;
  isSelected: boolean;
  isDragging: boolean;
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onSelect: () => void;
}

function NodeRenderer({
  node,
  isSelected,
  isDragging,
  isEditing,
  onMouseDown,
  onDoubleClick,
  onSelect,
}: NodeRendererProps) {
  const fillColor = getNodeFillColor(node.style);
  const strokeColor = isSelected
    ? "hsl(var(--primary))"
    : getNodeStrokeColor(node.style);
  const strokeWidth = isSelected ? 2.5 : 1.5;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className={`${isDragging ? "cursor-grabbing" : "cursor-pointer"}`}
      role="button"
      aria-label={`Node: ${node.label}`}
      tabIndex={0}
    >
      {/* Node shape */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={isRounded(node.style) ? 8 : 2}
        ry={isRounded(node.style) ? 8 : 2}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className="transition-colors duration-150"
      />

      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={node.x - 3}
          y={node.y - 3}
          width={node.width + 6}
          height={node.height + 6}
          rx={isRounded(node.style) ? 10 : 4}
          ry={isRounded(node.style) ? 10 : 4}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={0.6}
        />
      )}

      {/* Label text (hidden when inline editor is active) */}
      {!isEditing && (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none select-none fill-foreground text-xs"
          style={{ fontSize: "11px" }}
        >
          {truncateLabel(node.label, node.width)}
        </text>
      )}
    </g>
  );
}

// --- Edge Renderer ---

interface EdgeRendererProps {
  edge: DiagramEdge;
  nodes: DiagramNode[];
  isSelected: boolean;
}

function EdgeRenderer({ edge, nodes, isSelected }: EdgeRendererProps) {
  const sourceNode = nodes.find((n) => n.id === edge.sourceId);
  const targetNode = nodes.find((n) => n.id === edge.targetId);

  if (!sourceNode || !targetNode) return null;

  // Calculate center points of source and target
  const sx = sourceNode.x + sourceNode.width / 2;
  const sy = sourceNode.y + sourceNode.height / 2;
  const tx = targetNode.x + targetNode.width / 2;
  const ty = targetNode.y + targetNode.height / 2;

  // Calculate edge points at node boundaries
  const sourcePoint = getEdgePoint(sourceNode, tx, ty);
  const targetPoint = getEdgePoint(targetNode, sx, sy);

  const strokeColor = isSelected
    ? "hsl(var(--primary))"
    : "hsl(var(--muted-foreground))";

  // Midpoint for label
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  const midY = (sourcePoint.y + targetPoint.y) / 2;

  return (
    <g>
      {/* Edge line */}
      <line
        x1={sourcePoint.x}
        y1={sourcePoint.y}
        x2={targetPoint.x}
        y2={targetPoint.y}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1.5}
        markerEnd="url(#arrowhead)"
        className="transition-colors duration-150"
      />

      {/* Edge label */}
      {edge.label && (
        <text
          x={midX}
          y={midY - 8}
          textAnchor="middle"
          className="pointer-events-none select-none fill-muted-foreground"
          style={{ fontSize: "10px" }}
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}

// --- Utility Functions ---

function getEdgePoint(
  node: DiagramNode,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;

  const dx = targetX - cx;
  const dy = targetY - cy;
  const angle = Math.atan2(dy, dx);

  // Determine which side of the rectangle the edge intersects
  const halfW = node.width / 2;
  const halfH = node.height / 2;

  const tanAngle = Math.abs(Math.tan(angle));
  let x: number;
  let y: number;

  if (tanAngle <= halfH / halfW) {
    // Intersects left or right side
    x = dx > 0 ? cx + halfW : cx - halfW;
    y = cy + halfW * tanAngle * (dy > 0 ? 1 : -1);
  } else {
    // Intersects top or bottom side
    y = dy > 0 ? cy + halfH : cy - halfH;
    x = cx + (halfH / tanAngle) * (dx > 0 ? 1 : -1);
  }

  return { x, y };
}

function getNodeFillColor(style: string): string {
  const match = style.match(/fillColor=([^;]+)/);
  if (match && match[1] !== "none") return match[1];
  return "hsl(var(--card))";
}

function getNodeStrokeColor(style: string): string {
  const match = style.match(/strokeColor=([^;]+)/);
  if (match && match[1] !== "none") return match[1];
  return "hsl(var(--border))";
}

function isRounded(style: string): boolean {
  return style.includes("rounded=1");
}

function truncateLabel(label: string, maxWidth: number): string {
  const maxChars = Math.floor(maxWidth / 7);
  if (label.length <= maxChars) return label;
  return label.slice(0, maxChars - 1) + "…";
}

// --- Icons ---

function EmptyDiagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M10 6.5h4" />
      <path d="M6.5 10v4" />
      <path d="M17.5 10v4" />
      <path d="M10 17.5h4" />
    </svg>
  );
}
