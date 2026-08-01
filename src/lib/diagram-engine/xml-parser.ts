/**
 * Lightweight .drawio XML parser that extracts nodes and edges
 * from mxGraphModel XML for rendering in the DiagramCanvas.
 */

export interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: string;
  parentId?: string;
}

export interface DiagramEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  style: string;
}

export interface ParsedDiagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

/**
 * Parse mxGraphModel XML string into structured nodes and edges.
 * Uses DOMParser for browser-safe XML parsing.
 */
export function parseDiagramXml(xml: string): ParsedDiagram {
  if (!xml || xml.trim().length === 0) {
    return { nodes: [], edges: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    console.warn("XML parse error:", parseError.textContent);
    return { nodes: [], edges: [] };
  }

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  // Find all mxCell elements
  const cells = doc.querySelectorAll("mxCell");

  cells.forEach((cell) => {
    const id = cell.getAttribute("id") || "";
    const style = cell.getAttribute("style") || "";
    const value = cell.getAttribute("value") || "";
    const isVertex = cell.getAttribute("vertex") === "1";
    const isEdge = cell.getAttribute("edge") === "1";
    const parentId = cell.getAttribute("parent") || undefined;

    if (isVertex) {
      const geometry = cell.querySelector("mxGeometry");
      const x = parseFloat(geometry?.getAttribute("x") || "0");
      const y = parseFloat(geometry?.getAttribute("y") || "0");
      const width = parseFloat(geometry?.getAttribute("width") || "120");
      const height = parseFloat(geometry?.getAttribute("height") || "60");

      nodes.push({
        id,
        label: stripHtml(value),
        x,
        y,
        width,
        height,
        style,
        parentId: parentId !== "0" && parentId !== "1" ? parentId : undefined,
      });
    } else if (isEdge) {
      const sourceId = cell.getAttribute("source") || "";
      const targetId = cell.getAttribute("target") || "";

      if (sourceId && targetId) {
        edges.push({
          id,
          sourceId,
          targetId,
          label: stripHtml(value),
          style,
        });
      }
    }
  });

  // Also look for <object> wrapper elements (draw.io uses these for metadata)
  const objects = doc.querySelectorAll("object");
  objects.forEach((obj) => {
    const id = obj.getAttribute("id") || "";
    const label = obj.getAttribute("label") || "";
    const innerCell = obj.querySelector("mxCell");
    if (!innerCell) return;

    const style = innerCell.getAttribute("style") || "";
    const isVertex = innerCell.getAttribute("vertex") === "1";
    const isEdge = innerCell.getAttribute("edge") === "1";
    const parentId = innerCell.getAttribute("parent") || undefined;

    if (isVertex) {
      const geometry = innerCell.querySelector("mxGeometry");
      const x = parseFloat(geometry?.getAttribute("x") || "0");
      const y = parseFloat(geometry?.getAttribute("y") || "0");
      const width = parseFloat(geometry?.getAttribute("width") || "120");
      const height = parseFloat(geometry?.getAttribute("height") || "60");

      nodes.push({
        id,
        label: stripHtml(label),
        x,
        y,
        width,
        height,
        style,
        parentId: parentId !== "0" && parentId !== "1" ? parentId : undefined,
      });
    } else if (isEdge) {
      const sourceId = innerCell.getAttribute("source") || "";
      const targetId = innerCell.getAttribute("target") || "";

      if (sourceId && targetId) {
        edges.push({
          id,
          sourceId,
          targetId,
          label: stripHtml(label),
          style,
        });
      }
    }
  });

  return { nodes, edges };
}

/**
 * Strip basic HTML tags from a label string.
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#xa;/g, " ")
    .trim();
}
