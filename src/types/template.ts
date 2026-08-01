/**
 * Category identifiers for architecture templates.
 */
export type TemplateCategory =
  | 'web-application'
  | 'serverless'
  | 'microservices'
  | 'ai-ml'
  | 'data-analytics'
  | 'enterprise'
  | 'event-driven'
  | 'iot';

/**
 * A pre-built or custom architecture template.
 */
export interface Template {
  templateId: string;
  name: string;
  description: string; // 50-500 characters
  category: TemplateCategory;
  useCases: string[]; // At least 2 entries
  isBuiltIn: boolean;
  ownerId?: string; // userId for custom templates
  s3Key: string; // S3 key for template .drawio file
  createdAt: string;
}

/**
 * Request payload for saving a custom template.
 */
export interface SaveTemplateRequest {
  name: string; // 1-100 characters
  description: string; // 50-500 characters
  category: TemplateCategory;
  useCases: string[]; // At least 2 entries
  diagramId: string; // Source diagram to save as template
}

/**
 * Metadata displayed in the template gallery listing.
 */
export interface TemplateListItem {
  templateId: string;
  name: string;
  description: string;
  category: TemplateCategory;
  useCases: string[];
  isBuiltIn: boolean;
}
