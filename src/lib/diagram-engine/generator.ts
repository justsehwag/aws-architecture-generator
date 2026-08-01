/**
 * Diagram Engine - Core Generator
 *
 * Transforms an ArchitectureSpec JSON into a well-formed .drawio XML file.
 *
 * Pipeline:
 *   1. Validate input against ArchitectureSpec schema
 *   2. Resolve AWS icon styles from service registry
 *   3. Compute layout positions for nodes and containers
 *   4. Build mxGraphModel XML with containers, nodes, and edges
 *   5. Serialize to .drawio XML string
 *
 * Requirements covered:
 *   - 2.1: Produce valid .drawio XML from JSON spec
 *   - 2.2: Use official AWS Architecture Icons
 *   - 2.3: Group resources into containers (VPC, subnet, AZ, Region)
 *   - 2.4: Layout with <10% edge overlap
 *   - 2.5: Generic node for unrecognized services with review annotation
 *   - 2.6: Complete within 10 seconds for up to 50 services
 */

import type {
  ArchitectureSpec,
  ServiceNode,
  Connection,
  ResourceGroup,
} from '@/types/architecture';
import { getServiceIcon, isKnownService, GENERIC_NODE_STYLE } from '@/lib/aws-service-registry';
import {
  createMxGraphModel,
  createContainer,
  createNode,
  createEdge,
  serializeToXml,
  type MxGraphModel,
  type Bounds,
} from './xml-builder';
import { computeLayout, type LayoutOrientation } from './layout';

// ─── Container Style Constants ────────────────────────────────────────────────

const CONTAINER_STYLES: Record<ResourceGroup['type'], string> = {
  region: 'swimlane;startSize=24;fillColor=#f2f2f2;strokeColor=#666666;rounded=1;',
  vpc: 'swimlane;startSize=24;fillColor=#E7F4E4;strokeColor=#248714;rounded=1;',
  subnet: 'swimlane;startSize=24;fillColor=#EFF6FF;strokeColor=#147EB8;rounded=1;',
  'availability-zone': 'swimlane;startSize=24;fillColor=#FFF7ED;strokeColor=#D97706;rounded=1;',
  'security-group': 'swimlane;startSize=24;fillColor=#FEF2F2;strokeColor=#DC2626;dashed=1;rounded=1;',
};

// ─── Error Classes ────────────────────────────────────────────────────────────

export class DiagramGenerationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors?: string[]
  ) {
    super(message);
    this.name = 'DiagramGenerationError';
  }
}

// ─── Input Validation ─────────────────────────────────────────────────────────

/**
 * Validates an ArchitectureSpec input for required fields and consistency.
 * Returns an array of validation error messages (empty if valid).
 */
export function validateArchitectureSpec(spec: unknown): string[] {
  const errors: string[] = [];

  if (!spec || typeof spec !== 'object') {
    errors.push('Input must be a non-null object');
    return errors;
  }

  const s = spec as Record<string, unknown>;

  if (!s.id || typeof s.id !== 'string') {
    errors.push('Missing or invalid field: id (must be a non-empty string)');
  }

  if (!s.name || typeof s.name !== 'string') {
    errors.push('Missing or invalid field: name (must be a non-empty string)');
  }

  if (!Array.isArray(s.services)) {
    errors.push('Missing or invalid field: services (must be an array)');
  } else {
    for (let i = 0; i < s.services.length; i++) {
      const svc = s.services[i];
      if (!svc || typeof svc !== 'object') {
        errors.push(`services[${i}]: must be an object`);
        continue;
      }
      if (!svc.id || typeof svc.id !== 'string') {
        errors.push(`services[${i}]: missing or invalid id`);
      }
      if (!svc.type || typeof svc.type !== 'string') {
        errors.push(`services[${i}]: missing or invalid type`);
      }
      if (!svc.label || typeof svc.label !== 'string') {
        errors.push(`services[${i}]: missing or invalid label`);
      }
    }
  }

  if (!Array.isArray(s.connections)) {
    errors.push('Missing or invalid field: connections (must be an array)');
  } else {
    const serviceIds = new Set(
      Array.isArray(s.services) ? s.services.map((svc: { id?: string }) => svc?.id) : []
    );
    for (let i = 0; i < s.connections.length; i++) {
      const conn = s.connections[i];
      if (!conn || typeof conn !== 'object') {
        errors.push(`connections[${i}]: must be an object`);
        continue;
      }
      if (!conn.id || typeof conn.id !== 'string') {
        errors.push(`connections[${i}]: missing or invalid id`);
      }
      if (!conn.sourceId || typeof conn.sourceId !== 'string') {
        errors.push(`connections[${i}]: missing or invalid sourceId`);
      } else if (!serviceIds.has(conn.sourceId)) {
        errors.push(`connections[${i}]: sourceId "${conn.sourceId}" references non-existent service`);
      }
      if (!conn.targetId || typeof conn.targetId !== 'string') {
        errors.push(`connections[${i}]: missing or invalid targetId`);
      } else if (!serviceIds.has(conn.targetId)) {
        errors.push(`connections[${i}]: targetId "${conn.targetId}" references non-existent service`);
      }
    }
  }

  if (!Array.isArray(s.groups)) {
    errors.push('Missing or invalid field: groups (must be an array)');
  }

  return errors;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export interface GenerateDiagramOptions {
  orientation?: LayoutOrientation;
}

export interface GenerateDiagramResult {
  xml: string;
  warnings: string[];
}

/**
 * Generates a .drawio XML diagram from an ArchitectureSpec.
 *
 * @param spec - The validated architecture specification
 * @param options - Optional layout configuration
 * @returns The generated .drawio XML string and any warnings
 * @throws {DiagramGenerationError} if the input is invalid
 */
export function generateDiagram(
  spec: ArchitectureSpec,
  options: GenerateDiagramOptions = {}
): GenerateDiagramResult {
  // Validate input
  const errors = validateArchitectureSpec(spec);
  if (errors.length > 0) {
    throw new DiagramGenerationError(
      `Invalid architecture specification: ${errors.join('; ')}`,
      errors
    );
  }

  const warnings: string[] = [];
  const orientation = options.orientation ?? 'vertical';

  // Compute layout
  const { nodePositions, containerBounds } = computeLayout(
    spec.services,
    spec.connections,
    spec.groups,
    orientation
  );

  // Build model
  const model = createMxGraphModel();

  // Add containers (groups)
  addContainers(model, spec.groups, containerBounds);

  // Add service nodes
  addNodes(model, spec.services, spec.groups, nodePositions, warnings);

  // Add connection edges
  addEdges(model, spec.connections);

  // Serialize
  const xml = serializeToXml(model);

  return { xml, warnings };
}

// ─── Container Generation ─────────────────────────────────────────────────────

/**
 * Adds container cells to the model for each resource group.
 */
function addContainers(
  model: MxGraphModel,
  groups: ResourceGroup[],
  containerBounds: Map<string, Bounds>
): void {
  // Sort groups: parents first so nested containers reference existing parents
  const sorted = sortGroupsParentFirst(groups);

  for (const group of sorted) {
    const bounds = containerBounds.get(group.id) ?? {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    };

    const style = CONTAINER_STYLES[group.type] ?? CONTAINER_STYLES.region;
    const parentId = group.parentId && groups.some((g) => g.id === group.parentId)
      ? group.parentId
      : '1';

    const cell = createContainer(
      group.id,
      group.label,
      style,
      bounds,
      parentId
    );

    model.cells.push(cell);
  }
}

/**
 * Sorts groups so that parents appear before their children.
 */
function sortGroupsParentFirst(groups: ResourceGroup[]): ResourceGroup[] {
  const result: ResourceGroup[] = [];
  const added = new Set<string>();
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  function add(group: ResourceGroup) {
    if (added.has(group.id)) return;

    // Ensure parent is added first
    if (group.parentId && groupMap.has(group.parentId) && !added.has(group.parentId)) {
      add(groupMap.get(group.parentId)!);
    }

    result.push(group);
    added.add(group.id);
  }

  for (const group of groups) {
    add(group);
  }

  return result;
}

// ─── Node Generation ──────────────────────────────────────────────────────────

/**
 * Adds service node cells to the model.
 * Resolves AWS icon styles from the service registry.
 * Unknown services get a generic node with a review annotation.
 */
function addNodes(
  model: MxGraphModel,
  services: ServiceNode[],
  groups: ResourceGroup[],
  positions: Map<string, Bounds>,
  warnings: string[]
): void {
  // Build a map of node ID → container ID
  const nodeToContainer = new Map<string, string>();
  for (const group of groups) {
    for (const childId of group.children) {
      nodeToContainer.set(childId, group.id);
    }
  }

  for (const service of services) {
    const bounds = positions.get(service.id) ?? {
      x: 0,
      y: 0,
      width: 60,
      height: 60,
    };

    let style: string;
    let label = service.label;

    if (isKnownService(service.type)) {
      style = getServiceIcon(service.type);
    } else {
      // Unknown service: generic node with review annotation
      style = GENERIC_NODE_STYLE;
      label = `${service.label}\n[Review: Unrecognized service]`;
      warnings.push(
        `Service "${service.label}" (type: ${service.type}) is not in the supported registry. Rendered as generic node.`
      );
    }

    const parentId = nodeToContainer.get(service.id) ?? '1';

    const cell = createNode(service.id, label, style, bounds, parentId);
    model.cells.push(cell);
  }
}

// ─── Edge Generation ──────────────────────────────────────────────────────────

/**
 * Adds edge cells to the model for each connection.
 */
function addEdges(model: MxGraphModel, connections: Connection[]): void {
  for (const conn of connections) {
    let label: string | undefined;

    if (conn.label) {
      label = conn.label;
    } else if (conn.protocol) {
      label = conn.port ? `${conn.protocol}:${conn.port}` : conn.protocol;
    }

    const cell = createEdge(conn.id, conn.sourceId, conn.targetId, label);
    model.cells.push(cell);

    // If bidirectional, add a reverse edge
    if (conn.bidirectional) {
      const reverseCell = createEdge(
        `${conn.id}-reverse`,
        conn.targetId,
        conn.sourceId,
        label
      );
      model.cells.push(reverseCell);
    }
  }
}
