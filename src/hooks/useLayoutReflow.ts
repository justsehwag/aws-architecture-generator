"use client";

import * as React from "react";
import { useDiagram } from "@/components/diagram/DiagramContext";
import { computeLayout, type LayoutOrientation } from "@/lib/diagram-engine/layout";
import type { ServiceNode, Connection, ResourceGroup, AWSServiceType } from "@/types/architecture";

/**
 * Hook that re-computes node positions when the layout orientation changes.
 *
 * Takes the current nodes and edges from context, calls computeLayout()
 * from the diagram engine, and updates all node positions via context.
 *
 * Requirement 3.6: WHEN the user selects a layout orientation option,
 * THE Diagram_Viewer SHALL reflow the diagram in the chosen orientation
 * (horizontal left-to-right or vertical top-to-bottom) while preserving
 * all nodes and edges.
 */
export function useLayoutReflow() {
  const { state, updateNodePosition, setLayoutOrientation } = useDiagram();

  /**
   * Trigger a layout reflow in the specified orientation.
   * Converts diagram nodes to ServiceNodes for the layout engine,
   * computes new positions, and updates the context.
   */
  const reflowLayout = React.useCallback(
    (orientation: LayoutOrientation) => {
      // Update the orientation in context
      setLayoutOrientation(orientation);

      // Convert DiagramNodes to ServiceNodes for the layout engine
      const services: ServiceNode[] = state.nodes.map((node) => ({
        id: node.id,
        type: extractServiceType(node.style) as AWSServiceType,
        label: node.label,
        properties: {},
        position: { x: node.x, y: node.y },
      }));

      // Convert DiagramEdges to Connections
      const connections: Connection[] = state.edges.map((edge) => ({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        label: edge.label,
      }));

      // No resource groups for simple reflow (nodes retain their grouping)
      const groups: ResourceGroup[] = [];

      // Compute new layout positions
      const result = computeLayout(services, connections, groups, orientation);

      // Update each node's position from the computed layout
      for (const node of state.nodes) {
        const newBounds = result.nodePositions.get(node.id);
        if (newBounds) {
          updateNodePosition(node.id, newBounds.x, newBounds.y);
        }
      }
    },
    [state.nodes, state.edges, updateNodePosition, setLayoutOrientation]
  );

  return { reflowLayout };
}

/**
 * Extract a service type hint from a draw.io node style string.
 * Falls back to "generic" if no AWS shape reference is found.
 */
function extractServiceType(style: string): string {
  // Try to match AWS shape patterns like "shape=mxgraph.aws4.lambda"
  const shapeMatch = style.match(/shape=mxgraph\.aws4?\.(\w+)/);
  if (shapeMatch) return shapeMatch[1];

  // Try to match image-based patterns
  const imageMatch = style.match(/image=.*aws[_-]?(\w+)/i);
  if (imageMatch) return imageMatch[1];

  return "generic";
}
