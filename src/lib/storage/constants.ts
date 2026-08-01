/**
 * S3 Storage Constants
 *
 * Defines file size limits, expiry durations, and path builders
 * for the diagram storage layer.
 */

/** Maximum file size: 50 MB (per Requirement 16.4) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Default presigned URL expiry: 1 hour in seconds */
export const PRESIGNED_URL_EXPIRY = 3600;

/** S3 bucket name from environment variable */
export const S3_BUCKET_NAME =
  process.env.S3_DIAGRAM_BUCKET ?? 'arch-generator-files';

// ─── Path Builders ────────────────────────────────────────────────────────────

/**
 * Build the S3 key for a diagram's current .drawio file.
 * Pattern: diagrams/{userId}/{diagramId}/diagram.drawio
 */
export function getDiagramKey(userId: string, diagramId: string): string {
  return `diagrams/${userId}/${diagramId}/diagram.drawio`;
}

/**
 * Build the S3 key for an export file.
 * Pattern: diagrams/{userId}/{diagramId}/exports/diagram.{format}
 */
export function getExportKey(
  userId: string,
  diagramId: string,
  format: string
): string {
  return `diagrams/${userId}/${diagramId}/exports/diagram.${format}`;
}

/**
 * Build the S3 key for a versioned diagram snapshot.
 * Pattern: diagrams/{userId}/{diagramId}/versions/{versionId}.drawio
 */
export function getVersionKey(
  userId: string,
  diagramId: string,
  versionId: string
): string {
  return `diagrams/${userId}/${diagramId}/versions/${versionId}.drawio`;
}

/**
 * Build the S3 key for a built-in template.
 * Pattern: templates/built-in/{templateId}.drawio
 */
export function getTemplateKey(templateId: string): string {
  return `templates/built-in/${templateId}.drawio`;
}

/**
 * Build the S3 key for a user's custom template.
 * Pattern: templates/custom/{userId}/{templateId}.drawio
 */
export function getCustomTemplateKey(
  userId: string,
  templateId: string
): string {
  return `templates/custom/${userId}/${templateId}.drawio`;
}
