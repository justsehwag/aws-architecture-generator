/**
 * Draw.io XML Builder Utilities
 *
 * Provides functions to construct well-formed .drawio XML (mxGraphModel)
 * from individual cells: containers, nodes, and edges.
 *
 * Uses the mxGraph XML format expected by Draw.io.
 * @see https://www.drawio.com/doc/faq/save-file-formats
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MxCell {
  id: string;
  value: string;
  style: string;
  vertex?: boolean;
  edge?: boolean;
  parent: string;
  source?: string;
  target?: string;
  geometry?: Bounds;
}

export interface MxGraphModel {
  cells: MxCell[];
}

// ─── XML Escaping ─────────────────────────────────────────────────────────────

/**
 * Escapes special XML characters in attribute values.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Factory Functions ────────────────────────────────────────────────────────

/**
 * Creates an empty mxGraphModel with the required root cells (id=0 and id=1).
 */
export function createMxGraphModel(): MxGraphModel {
  return {
    cells: [
      { id: '0', value: '', style: '', parent: '' },
      { id: '1', value: '', style: '', parent: '0' },
    ],
  };
}

/**
 * Creates a container cell (swimlane) for VPC, AZ, Region, or subnet groupings.
 */
export function createContainer(
  id: string,
  label: string,
  style: string,
  bounds: Bounds,
  parentId: string = '1'
): MxCell {
  return {
    id,
    value: label,
    style: `${style}html=1;collapsible=0;`,
    vertex: true,
    parent: parentId,
    geometry: bounds,
  };
}

/**
 * Creates a service node cell with an AWS icon style.
 */
export function createNode(
  id: string,
  label: string,
  style: string,
  bounds: Bounds,
  parentId: string = '1'
): MxCell {
  return {
    id,
    value: label,
    style: `${style};labelBackgroundColor=none;sketch=0;fontColor=#232F3E;html=1;`,
    vertex: true,
    parent: parentId,
    geometry: bounds,
  };
}

/**
 * Creates an edge cell connecting two nodes.
 */
export function createEdge(
  id: string,
  sourceId: string,
  targetId: string,
  label?: string
): MxCell {
  return {
    id,
    value: label ?? '',
    style: 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#232F3E;',
    edge: true,
    parent: '1',
    source: sourceId,
    target: targetId,
  };
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Serializes an MxGraphModel to a complete .drawio XML string.
 * Produces well-formed XML that can be opened in Draw.io without errors.
 */
export function serializeToXml(model: MxGraphModel): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<mxfile>');
  lines.push('  <diagram name="Architecture">');
  lines.push('    <mxGraphModel>');
  lines.push('      <root>');

  for (const cell of model.cells) {
    lines.push(serializeCell(cell));
  }

  lines.push('      </root>');
  lines.push('    </mxGraphModel>');
  lines.push('  </diagram>');
  lines.push('</mxfile>');

  return lines.join('\n');
}

/**
 * Serializes a single MxCell to its XML element representation.
 */
function serializeCell(cell: MxCell): string {
  const attrs: string[] = [];

  attrs.push(`id="${escapeXml(cell.id)}"`);

  if (cell.value) {
    attrs.push(`value="${escapeXml(cell.value)}"`);
  }

  if (cell.style) {
    attrs.push(`style="${escapeXml(cell.style)}"`);
  }

  if (cell.vertex) {
    attrs.push('vertex="1"');
  }

  if (cell.edge) {
    attrs.push('edge="1"');
  }

  if (cell.parent) {
    attrs.push(`parent="${escapeXml(cell.parent)}"`);
  }

  if (cell.source) {
    attrs.push(`source="${escapeXml(cell.source)}"`);
  }

  if (cell.target) {
    attrs.push(`target="${escapeXml(cell.target)}"`);
  }

  const indent = '        ';

  if (cell.geometry) {
    const geo = cell.geometry;
    return [
      `${indent}<mxCell ${attrs.join(' ')}>`,
      `${indent}  <mxGeometry x="${geo.x}" y="${geo.y}" width="${geo.width}" height="${geo.height}" as="geometry" />`,
      `${indent}</mxCell>`,
    ].join('\n');
  }

  if (cell.edge) {
    return [
      `${indent}<mxCell ${attrs.join(' ')}>`,
      `${indent}  <mxGeometry relative="1" as="geometry" />`,
      `${indent}</mxCell>`,
    ].join('\n');
  }

  return `${indent}<mxCell ${attrs.join(' ')} />`;
}
