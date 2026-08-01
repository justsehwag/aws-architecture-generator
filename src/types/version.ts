/**
 * A versioned snapshot of a diagram, either autosaved or explicitly named.
 */
export interface DiagramVersion {
  versionId: string;
  diagramId: string;
  name: string; // User-provided or "Autosave"
  createdAt: string;
  createdBy: string;
  isAutosave: boolean;
  s3Key: string; // Reference to .drawio file in S3
}

/**
 * Request payload for generating Infrastructure as Code from a diagram.
 */
export interface IaCRequest {
  diagramId: string;
  format: 'terraform' | 'cdk-typescript' | 'cloudformation';
}

/**
 * Response payload from the IaC generation endpoint.
 */
export interface IaCResponse {
  code: string;
  format: string;
  warnings: string[]; // Unsupported resources
  resourceCount: number;
}
