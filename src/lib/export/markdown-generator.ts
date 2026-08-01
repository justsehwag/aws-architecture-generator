/**
 * Markdown Generator for Architecture Specifications
 *
 * Generates a Markdown document containing:
 * - Architecture summary heading
 * - Service table (name, type, description)
 * - Connections list
 *
 * Validates: Requirement 4.7
 */

import type { ArchitectureSpec } from '@/types/architecture';

/**
 * Generate a Markdown document summarizing the architecture.
 *
 * @param spec - The architecture specification to document
 * @returns Markdown string with architecture summary
 */
export function generateMarkdown(spec: ArchitectureSpec): string {
  const lines: string[] = [];

  // Title and description
  lines.push(`# ${spec.name}`);
  lines.push('');
  lines.push(spec.description);
  lines.push('');

  // Metadata section
  lines.push('## Overview');
  lines.push('');
  lines.push(`- **Region:** ${spec.region}`);
  lines.push(`- **Services:** ${spec.services.length}`);
  lines.push(`- **Connections:** ${spec.connections.length}`);
  lines.push(`- **Generated:** ${spec.metadata.generatedAt}`);
  lines.push(`- **Model:** ${spec.metadata.llmModel}`);
  lines.push('');

  // Services table
  lines.push('## Services');
  lines.push('');
  lines.push('| Service | Type | Description |');
  lines.push('|---------|------|-------------|');

  for (const service of spec.services) {
    const description =
      service.properties['description'] || service.properties['purpose'] || '-';
    lines.push(
      `| ${service.label} | ${service.type} | ${description} |`
    );
  }

  lines.push('');

  // Resource groups section
  if (spec.groups.length > 0) {
    lines.push('## Resource Groups');
    lines.push('');

    for (const group of spec.groups) {
      const childLabels = group.children
        .map((childId) => {
          const service = spec.services.find((s) => s.id === childId);
          return service?.label ?? childId;
        })
        .join(', ');

      lines.push(`- **${group.label}** (${group.type}): ${childLabels}`);
    }

    lines.push('');
  }

  // Connections section
  if (spec.connections.length > 0) {
    lines.push('## Connections');
    lines.push('');

    for (const conn of spec.connections) {
      const source = spec.services.find((s) => s.id === conn.sourceId);
      const target = spec.services.find((s) => s.id === conn.targetId);
      const sourceName = source?.label ?? conn.sourceId;
      const targetName = target?.label ?? conn.targetId;

      const details: string[] = [];
      if (conn.protocol) details.push(conn.protocol);
      if (conn.port) details.push(`port ${conn.port}`);
      if (conn.label) details.push(conn.label);

      const direction = conn.bidirectional ? '↔' : '→';
      const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';

      lines.push(`- ${sourceName} ${direction} ${targetName}${suffix}`);
    }

    lines.push('');
  }

  // Original prompt section
  if (spec.metadata.prompt) {
    lines.push('## Original Prompt');
    lines.push('');
    lines.push(`> ${spec.metadata.prompt}`);
    lines.push('');
  }

  return lines.join('\n');
}
