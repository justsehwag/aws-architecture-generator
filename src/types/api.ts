import type { ArchitectureSpec } from './architecture';
import type { ArchitectureAnalysis } from './analysis';
import type { CostEstimate } from './cost';

/**
 * User preferences for diagram generation.
 */
export interface GenerationPreferences {
  region: string;
  layoutOrientation: 'horizontal' | 'vertical';
  includeAnalysis: boolean;
  includeCostEstimate: boolean;
}

/**
 * Request payload for generating a diagram from a natural language prompt.
 */
export interface GenerateDiagramRequest {
  prompt: string; // 10-5000 characters
  templateId?: string;
  preferences?: GenerationPreferences;
}

/**
 * Explanation of the generated architecture for non-technical stakeholders.
 */
export interface ArchitectureExplanation {
  summary: string;
  serviceDescriptions: ServiceDescription[];
  bestPractices: string[];
}

/**
 * Description of an individual service in the architecture explanation.
 */
export interface ServiceDescription {
  serviceName: string;
  purpose: string;
  connections: string[];
}

/**
 * Response payload from the diagram generation endpoint.
 */
export interface GenerateDiagramResponse {
  diagramId: string;
  drawioXml: string;
  architectureSpec: ArchitectureSpec;
  explanation: ArchitectureExplanation;
  analysis?: ArchitectureAnalysis;
  costEstimate?: CostEstimate;
}

/**
 * Options for export format customization.
 */
export interface ExportOptions {
  pngDpi?: number; // default: 300
  pdfPageSize?: 'a4' | 'letter' | 'a3';
}

/**
 * Request payload for exporting a diagram in a specific format.
 */
export interface ExportRequest {
  diagramId: string;
  format: 'drawio' | 'png' | 'svg' | 'pdf' | 'json' | 'markdown';
  options?: ExportOptions;
}

/**
 * Response payload from the export endpoint containing download information.
 */
export interface ExportResponse {
  downloadUrl: string; // Pre-signed S3 URL
  expiresAt: string; // URL expiry timestamp
  format: string;
  fileSizeBytes: number;
}
