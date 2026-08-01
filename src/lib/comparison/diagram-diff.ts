/**
 * Diagram Diff Utility
 *
 * Compares two ArchitectureSpec objects and identifies structural differences:
 * - Added services (present in B but not in A)
 * - Removed services (present in A but not in B)
 * - Modified services (same ID but different type, label, or properties)
 *
 * Validates: Requirements 17.1, 17.7
 */

import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';

/**
 * A modified service pair showing the before and after state.
 */
export interface ModifiedService {
  before: ServiceNode;
  after: ServiceNode;
}

/**
 * The result of comparing two architecture specifications.
 */
export interface DiagramDiffResult {
  /** Services present in specB but not in specA */
  added: ServiceNode[];
  /** Services present in specA but not in specB */
  removed: ServiceNode[];
  /** Services with the same ID but different type, label, or properties */
  modified: ModifiedService[];
}

/**
 * Compare two ArchitectureSpec objects to find structural differences.
 *
 * Comparison is based on service IDs:
 * - Same ID in both = potentially modified (checked for changes)
 * - ID only in specA = removed
 * - ID only in specB = added
 * - Modified = same ID but different type, label, or properties
 */
export function diffDiagrams(
  specA: ArchitectureSpec,
  specB: ArchitectureSpec
): DiagramDiffResult {
  const servicesA = new Map<string, ServiceNode>();
  const servicesB = new Map<string, ServiceNode>();

  for (const service of specA.services) {
    servicesA.set(service.id, service);
  }

  for (const service of specB.services) {
    servicesB.set(service.id, service);
  }

  const added: ServiceNode[] = [];
  const removed: ServiceNode[] = [];
  const modified: ModifiedService[] = [];

  // Find removed and modified services
  servicesA.forEach((serviceA, id) => {
    const serviceB = servicesB.get(id);
    if (!serviceB) {
      removed.push(serviceA);
    } else if (hasServiceChanged(serviceA, serviceB)) {
      modified.push({ before: serviceA, after: serviceB });
    }
  });

  // Find added services
  servicesB.forEach((serviceB, id) => {
    if (!servicesA.has(id)) {
      added.push(serviceB);
    }
  });

  return { added, removed, modified };
}

/**
 * Determine if a service node has changed between two versions.
 * Compares type, label, and properties (shallow comparison).
 */
function hasServiceChanged(a: ServiceNode, b: ServiceNode): boolean {
  if (a.type !== b.type) return true;
  if (a.label !== b.label) return true;
  if (!shallowEqual(a.properties, b.properties)) return true;
  return false;
}

/**
 * Shallow equality check for Record<string, string> objects.
 */
function shallowEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}
