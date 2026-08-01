/**
 * Reference checklist for detecting missing infrastructure components.
 *
 * This module re-exports the missing component detection logic
 * and defines the reference checklist constants used by the analyzer.
 *
 * Detection rules:
 * - If compute exists but no load balancer → recommend ALB
 * - If VPC has private subnets but no NAT gateway → recommend NAT
 * - If no CloudWatch detected → recommend monitoring
 * - If no Route53 → recommend DNS
 * - If no CloudFront and has web-facing services → recommend CDN
 * - If no Backup service and has data stores → recommend backup
 *
 * Validates: Requirement 6.1
 */

export { detectMissingComponents } from './rules/missing-components';

/**
 * Reference checklist categories for architecture completeness assessment.
 * Each category maps to a detection rule in missing-components.ts.
 */
export const REFERENCE_CHECKLIST_CATEGORIES = [
  'Load Balancer',
  'NAT Gateway',
  'Monitoring',
  'DNS',
  'CDN',
  'Backup Service',
  'WAF (Web Application Firewall)',
  'Secrets Management',
  'VPC',
  'Auto Scaling',
] as const;

export type ReferenceChecklistCategory = typeof REFERENCE_CHECKLIST_CATEGORIES[number];
