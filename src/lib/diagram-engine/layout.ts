/**
 * Layout Algorithm for AWS Architecture Diagrams
 *
 * Positions nodes in a hierarchical grid layout organized by service tier:
 *   Networking → Compute → Application Integration → Storage → Database → Analytics → Other
 *
 * Uses topological sort to minimize edge crossings. Supports both horizontal
 * and vertical orientations. Targets <10% edge overlap per Requirement 2.4.
 */

import type { ServiceNode, Connection, ResourceGroup } from '@/types/architecture';
import type { Bounds } from './xml-builder';
import { getServiceCategory, type ServiceCategory } from '@/lib/aws-service-registry';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Default node dimensions */
const NODE_WIDTH = 60;
const NODE_HEIGHT = 60;

/** Spacing between nodes */
const NODE_SPACING_X = 140;
const NODE_SPACING_Y = 100;

/** Container padding */
const CONTAINER_PADDING_TOP = 40;
const CONTAINER_PADDING_SIDE = 20;
const CONTAINER_PADDING_BOTTOM = 20;

/** Tier ordering for vertical layout (top to bottom) */
const TIER_ORDER: ServiceCategory[] = [
  'Networking',
  'Security',
  'Compute',
  'Containers',
  'Application Integration',
  'AI/ML',
  'Storage',
  'Databases',
  'Analytics',
  'Management',
  'Developer Tools',
  'Migration',
  'IoT',
  'Media',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type LayoutOrientation = 'horizontal' | 'vertical';

export interface LayoutResult {
  nodePositions: Map<string, Bounds>;
  containerBounds: Map<string, Bounds>;
}

// ─── Main Layout Function ─────────────────────────────────────────────────────

/**
 * Computes positions for all nodes and containers in an architecture spec.
 *
 * Algorithm:
 * 1. Classify nodes into tiers by their service category
 * 2. Within each tier, order nodes by topological dependencies
 * 3. Assign grid positions by tier (row) and column
 * 4. Compute container bounds to enclose grouped nodes
 *
 * @param services - All service nodes in the architecture
 * @param connections - All connections between services
 * @param groups - Resource groups (containers)
 * @param orientation - Layout direction (vertical = top-to-bottom, horizontal = left-to-right)
 * @returns Positioned bounds for every node and container
 */
export function computeLayout(
  services: ServiceNode[],
  connections: Connection[],
  groups: ResourceGroup[],
  orientation: LayoutOrientation = 'vertical'
): LayoutResult {
  const nodePositions = new Map<string, Bounds>();
  const containerBounds = new Map<string, Bounds>();

  if (services.length === 0) {
    return { nodePositions, containerBounds };
  }

  // Step 1: Classify nodes into tiers by service category
  const tiers = classifyIntoTiers(services);

  // Step 2: Order nodes within each tier using topological sort
  const orderedTiers = orderWithinTiers(tiers, connections);

  // Step 3: Assign grid positions
  assignGridPositions(orderedTiers, orientation, nodePositions);

  // Step 4: Compute container bounds
  computeContainerBounds(groups, services, nodePositions, containerBounds);

  // Step 5: Adjust node positions to be relative to container if grouped
  adjustForContainers(services, groups, nodePositions, containerBounds);

  return { nodePositions, containerBounds };
}

// ─── Tier Classification ──────────────────────────────────────────────────────

/**
 * Groups service nodes by their category tier.
 */
function classifyIntoTiers(services: ServiceNode[]): Map<number, ServiceNode[]> {
  const tiers = new Map<number, ServiceNode[]>();

  for (const service of services) {
    const category = getServiceCategory(service.type);
    let tierIndex = category ? TIER_ORDER.indexOf(category) : -1;
    if (tierIndex === -1) {
      tierIndex = TIER_ORDER.length; // Ungrouped goes last
    }

    const existing = tiers.get(tierIndex) ?? [];
    existing.push(service);
    tiers.set(tierIndex, existing);
  }

  return tiers;
}

// ─── Topological Ordering ─────────────────────────────────────────────────────

/**
 * Orders nodes within each tier to minimize edge crossings.
 * Uses a simplified adjacency-based ordering: nodes with more upstream
 * connections are placed earlier (left/top).
 */
function orderWithinTiers(
  tiers: Map<number, ServiceNode[]>,
  connections: Connection[]
): { tierIndex: number; nodes: ServiceNode[] }[] {
  // Build adjacency: for each node, count incoming connections from earlier tiers
  const incomingCount = new Map<string, number>();

  for (const conn of connections) {
    const count = incomingCount.get(conn.targetId) ?? 0;
    incomingCount.set(conn.targetId, count + 1);
  }

  const sorted: { tierIndex: number; nodes: ServiceNode[] }[] = [];

  // Sort tier indices to maintain proper ordering
  const tierIndices = Array.from(tiers.keys()).sort((a, b) => a - b);

  for (const tierIndex of tierIndices) {
    const nodes = tiers.get(tierIndex) ?? [];

    // Sort within tier: nodes with more incoming edges go first (act as hubs)
    const orderedNodes = [...nodes].sort((a, b) => {
      const aIn = incomingCount.get(a.id) ?? 0;
      const bIn = incomingCount.get(b.id) ?? 0;
      return bIn - aIn; // More incoming → earlier position
    });

    sorted.push({ tierIndex, nodes: orderedNodes });
  }

  return sorted;
}

// ─── Grid Position Assignment ─────────────────────────────────────────────────

/**
 * Assigns (x, y, width, height) to each node in a grid layout.
 */
function assignGridPositions(
  orderedTiers: { tierIndex: number; nodes: ServiceNode[] }[],
  orientation: LayoutOrientation,
  positions: Map<string, Bounds>
): void {
  for (let row = 0; row < orderedTiers.length; row++) {
    const tier = orderedTiers[row];

    for (let col = 0; col < tier.nodes.length; col++) {
      const node = tier.nodes[col];

      let x: number;
      let y: number;

      if (orientation === 'vertical') {
        // Top-to-bottom: tiers are rows, nodes within tier are columns
        x = col * NODE_SPACING_X + CONTAINER_PADDING_SIDE;
        y = row * NODE_SPACING_Y + CONTAINER_PADDING_TOP;
      } else {
        // Left-to-right: tiers are columns, nodes within tier are rows
        x = row * NODE_SPACING_X + CONTAINER_PADDING_SIDE;
        y = col * NODE_SPACING_Y + CONTAINER_PADDING_TOP;
      }

      positions.set(node.id, {
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }
  }
}

// ─── Container Bounds Computation ─────────────────────────────────────────────

/**
 * Computes the bounding box for each container (VPC, subnet, AZ, Region)
 * based on the positions of its child nodes.
 */
function computeContainerBounds(
  groups: ResourceGroup[],
  services: ServiceNode[],
  nodePositions: Map<string, Bounds>,
  containerBounds: Map<string, Bounds>
): void {
  // Process groups from leaf containers to root (children first)
  const sorted = topologicalSortGroups(groups);

  for (const group of sorted) {
    // Gather bounds from direct child nodes
    const childBounds: Bounds[] = [];

    for (const childId of group.children) {
      const nodeBound = nodePositions.get(childId);
      if (nodeBound) {
        childBounds.push(nodeBound);
      }
    }

    // Also include nested containers
    for (const otherGroup of groups) {
      if (otherGroup.parentId === group.id) {
        const nested = containerBounds.get(otherGroup.id);
        if (nested) {
          childBounds.push(nested);
        }
      }
    }

    if (childBounds.length === 0) {
      // Empty container: give it a minimal size
      containerBounds.set(group.id, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
      });
      continue;
    }

    const minX = Math.min(...childBounds.map((b) => b.x));
    const minY = Math.min(...childBounds.map((b) => b.y));
    const maxX = Math.max(...childBounds.map((b) => b.x + b.width));
    const maxY = Math.max(...childBounds.map((b) => b.y + b.height));

    containerBounds.set(group.id, {
      x: minX - CONTAINER_PADDING_SIDE,
      y: minY - CONTAINER_PADDING_TOP,
      width: maxX - minX + 2 * CONTAINER_PADDING_SIDE,
      height: maxY - minY + CONTAINER_PADDING_TOP + CONTAINER_PADDING_BOTTOM,
    });
  }
}

/**
 * Sorts groups so that leaf containers are processed before their parents.
 */
function topologicalSortGroups(groups: ResourceGroup[]): ResourceGroup[] {
  const visited = new Set<string>();
  const result: ResourceGroup[] = [];
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  function visit(group: ResourceGroup) {
    if (visited.has(group.id)) return;
    visited.add(group.id);

    // Visit children groups first
    for (const other of groups) {
      if (other.parentId === group.id) {
        visit(other);
      }
    }

    result.push(group);
  }

  // Start from root groups (no parent)
  for (const group of groups) {
    if (!group.parentId || !groupMap.has(group.parentId)) {
      visit(group);
    }
  }

  // Handle any remaining unvisited groups
  for (const group of groups) {
    if (!visited.has(group.id)) {
      visit(group);
    }
  }

  // Reverse so leaves come first
  return result.reverse();
}

// ─── Container Adjustment ─────────────────────────────────────────────────────

/**
 * Adjusts node positions to be relative to their parent container's position.
 * Repositions containers to avoid overlap in the final diagram.
 */
function adjustForContainers(
  services: ServiceNode[],
  groups: ResourceGroup[],
  nodePositions: Map<string, Bounds>,
  containerBounds: Map<string, Bounds>
): void {
  // Determine which nodes belong to which container
  const nodeToContainer = new Map<string, string>();
  for (const group of groups) {
    for (const childId of group.children) {
      nodeToContainer.set(childId, group.id);
    }
  }

  // Find root-level containers (no parent)
  const rootContainers = groups.filter(
    (g) => !g.parentId || !groups.some((other) => other.id === g.parentId)
  );

  // Lay out root containers horizontally with spacing
  let containerOffsetX = CONTAINER_PADDING_SIDE;
  for (const container of rootContainers) {
    const bounds = containerBounds.get(container.id);
    if (bounds) {
      bounds.x = containerOffsetX;
      bounds.y = CONTAINER_PADDING_TOP;
      containerBounds.set(container.id, bounds);
      containerOffsetX += bounds.width + CONTAINER_PADDING_SIDE * 2;
    }
  }

  // Reposition child nodes relative to container top-left
  for (const service of services) {
    const containerId = nodeToContainer.get(service.id);
    if (!containerId) continue;

    const containerBound = containerBounds.get(containerId);
    const nodeBound = nodePositions.get(service.id);
    if (!containerBound || !nodeBound) continue;

    // Make node coordinates relative to container
    nodePositions.set(service.id, {
      x: nodeBound.x - containerBound.x + CONTAINER_PADDING_SIDE,
      y: nodeBound.y - containerBound.y + CONTAINER_PADDING_TOP,
      width: nodeBound.width,
      height: nodeBound.height,
    });
  }

  // Place ungrouped nodes below all containers
  const maxContainerBottom = Math.max(
    0,
    ...Array.from(containerBounds.values()).map((b) => b.y + b.height)
  );

  let ungroupedCol = 0;
  for (const service of services) {
    if (!nodeToContainer.has(service.id)) {
      nodePositions.set(service.id, {
        x: ungroupedCol * NODE_SPACING_X + CONTAINER_PADDING_SIDE,
        y: maxContainerBottom + NODE_SPACING_Y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
      ungroupedCol++;
    }
  }
}

// ─── Exports for testing ──────────────────────────────────────────────────────

export {
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_SPACING_X,
  NODE_SPACING_Y,
  CONTAINER_PADDING_TOP,
  CONTAINER_PADDING_SIDE,
  CONTAINER_PADDING_BOTTOM,
};
