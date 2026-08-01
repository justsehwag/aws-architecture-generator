/**
 * Architecture explanation generator.
 *
 * Produces plain-language explanations, service summary tables, and best
 * practice recommendations from an ArchitectureSpec. Works directly from
 * the spec and service registry metadata without requiring an LLM call.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import type { ArchitectureSpec, ServiceNode, Connection } from '@/types/architecture';
import type { ArchitectureExplanation, ServiceDescription } from '@/types/api';
import { getServiceEntry } from '@/lib/aws-service-registry';
import { generateBestPractices } from './best-practices';
import { expandAcronyms } from './acronym-expander';
import { getServiceDescription } from './service-descriptions';

/**
 * Get the purpose description for a service node.
 * Uses the service-descriptions module first, then falls back to
 * a generic description based on the service label.
 */
function getServicePurpose(service: ServiceNode): string {
  const mapped = getServiceDescription(service.type);
  if (mapped) return mapped;
  return `Provides ${service.label} functionality in the architecture`;
}

/**
 * Get the display name for a service, preferring the registry display name.
 */
function getServiceDisplayName(service: ServiceNode): string {
  const entry = getServiceEntry(service.type);
  if (entry) return entry.displayName;
  return service.label || service.type;
}

/**
 * Find all connections for a specific service node, returning human-readable
 * descriptions of connected services.
 */
function getConnectionDescriptions(
  serviceId: string,
  connections: Connection[],
  services: ServiceNode[]
): string[] {
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const connectedNames: string[] = [];

  for (const conn of connections) {
    if (conn.sourceId === serviceId) {
      const target = serviceMap.get(conn.targetId);
      if (target) {
        const name = getServiceDisplayName(target);
        const label = conn.label ? ` (${conn.label})` : '';
        connectedNames.push(`${name}${label}`);
      }
    } else if (conn.targetId === serviceId) {
      const source = serviceMap.get(conn.sourceId);
      if (source) {
        const name = getServiceDisplayName(source);
        const label = conn.label ? ` (${conn.label})` : '';
        connectedNames.push(`${name}${label}`);
      }
    }
  }

  // Deduplicate
  return Array.from(new Set(connectedNames));
}

/**
 * Generate a plain-language summary of the architecture.
 * Describes each service and its role without undefined acronyms (Requirement 8.1).
 */
function generateSummary(spec: ArchitectureSpec): string {
  if (spec.services.length === 0) {
    return 'This architecture does not contain any AWS services.';
  }

  const parts: string[] = [];

  // Opening paragraph
  parts.push(
    `This architecture, "${spec.name}", is deployed in the ${spec.region} region and consists of ${spec.services.length} AWS service${spec.services.length !== 1 ? 's' : ''} working together.`
  );

  if (spec.description) {
    parts.push(spec.description);
  }

  // Group services by category for a structured explanation
  const categoryGroups = new Map<string, ServiceNode[]>();
  for (const service of spec.services) {
    const entry = getServiceEntry(service.type);
    const category = entry?.category || 'Other';
    const existing = categoryGroups.get(category) || [];
    existing.push(service);
    categoryGroups.set(category, existing);
  }

  for (const [category, services] of Array.from(categoryGroups.entries())) {
    const serviceDescriptions = services
      .map((s: ServiceNode) => {
        const displayName = getServiceDisplayName(s);
        const purpose = getServicePurpose(s);
        // Use a shorter inline description (first sentence only)
        const shortPurpose = purpose.includes('. ')
          ? purpose.split('. ')[0]
          : purpose;
        const lowerPurpose =
          shortPurpose.charAt(0).toLowerCase() + shortPurpose.slice(1);
        return `${displayName} ${lowerPurpose}`;
      })
      .join('; ');

    parts.push(`In the ${category} layer: ${serviceDescriptions}.`);
  }

  // Describe groups/containers
  if (spec.groups.length > 0) {
    const groupDescriptions = spec.groups
      .map((g) => `${g.label} (${g.type})`)
      .join(', ');
    parts.push(
      `Resources are organized within the following logical boundaries: ${groupDescriptions}.`
    );
  }

  const rawSummary = parts.join(' ');
  return expandAcronyms(rawSummary);
}

/**
 * Generate the service summary table with columns:
 * - Service Name
 * - Purpose
 * - Connections (list of connected services)
 *
 * One row per service node (Requirement 8.2).
 */
function generateServiceTable(spec: ArchitectureSpec): ServiceDescription[] {
  return spec.services.map((service) => {
    const serviceName = getServiceDisplayName(service);
    const purpose = getServicePurpose(service);
    const connections = getConnectionDescriptions(
      service.id,
      spec.connections,
      spec.services
    );

    return {
      serviceName,
      purpose,
      connections: connections.length > 0 ? connections : ['None'],
    };
  });
}

/**
 * Generate a complete architecture explanation from an ArchitectureSpec.
 *
 * Produces:
 * - A plain-language summary with no undefined acronyms (Requirement 8.1)
 * - A service summary table with service name, purpose, connections (Requirement 8.2)
 * - Up to 10 best practice recommendations per the Well-Architected Framework (Requirement 8.3)
 *
 * Designed to complete within 5 seconds for architectures up to 50 services (Requirement 8.4).
 *
 * @param spec - The architecture specification to explain
 * @returns ArchitectureExplanation with summary, service descriptions, and best practices
 */
export function generateExplanation(spec: ArchitectureSpec): ArchitectureExplanation {
  const summary = generateSummary(spec);
  const serviceDescriptions = generateServiceTable(spec);
  const bestPractices = generateBestPractices(spec, 10);

  return {
    summary,
    serviceDescriptions,
    bestPractices,
  };
}
