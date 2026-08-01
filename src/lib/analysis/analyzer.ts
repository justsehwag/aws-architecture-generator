/**
 * Core architecture analysis logic.
 *
 * Orchestrates missing component detection, Well-Architected evaluation,
 * and recommendation generation for a given architecture specification.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';
import type {
  ArchitectureAnalysis,
  MissingComponent,
  Recommendation,
} from '@/types/analysis';
import { evaluateWellArchitected } from './well-architected';
import {
  getSecurityRecommendations,
  getHighAvailabilityRecommendations,
  getCostOptimizationRecommendations,
} from './recommendations';

/**
 * A rule for detecting missing components in an architecture.
 * Each rule checks whether the architecture has a gap and suggests a service to fill it.
 */
interface MissingComponentRule {
  /** What the missing component is */
  type: string;
  /** Severity of the gap */
  severity: MissingComponent['severity'];
  /** Why the component should be added */
  reason: string;
  /** The AWS service suggested to fill the gap */
  suggestedService: MissingComponent['suggestedService'];
  /** Returns true if the component is missing from the architecture */
  condition: (serviceTypes: Set<string>, spec: ArchitectureSpec) => boolean;
}

/**
 * Reference checklist of common infrastructure components.
 * These rules detect missing services based on what the architecture already has.
 */
const MISSING_COMPONENT_RULES: MissingComponentRule[] = [
  {
    type: 'Load Balancer',
    severity: 'critical',
    reason:
      'Architecture has compute services (EC2/ECS/EKS) but no load balancer to distribute traffic and provide failover.',
    suggestedService: 'alb',
    condition: (types) =>
      !types.has('alb') &&
      !types.has('nlb') &&
      !types.has('elb') &&
      (types.has('ec2') || types.has('ecs') || types.has('eks')),
  },
  {
    type: 'Monitoring',
    severity: 'critical',
    reason:
      'Architecture has compute services but no monitoring. CloudWatch is essential for observability and alerting.',
    suggestedService: 'cloudwatch',
    condition: (types) =>
      !types.has('cloudwatch') &&
      (types.has('ec2') ||
        types.has('lambda') ||
        types.has('ecs') ||
        types.has('rds')),
  },
  {
    type: 'Backup',
    severity: 'recommended',
    reason:
      'Architecture has database/storage services but no backup solution. AWS Backup provides centralized backup management.',
    suggestedService: 'backup',
    condition: (types) =>
      !types.has('backup') &&
      (types.has('rds') ||
        types.has('aurora') ||
        types.has('dynamodb') ||
        types.has('ebs') ||
        types.has('efs')),
  },
  {
    type: 'Web Application Firewall',
    severity: 'critical',
    reason:
      'Architecture has public-facing services but no WAF. AWS WAF protects against common web exploits.',
    suggestedService: 'waf',
    condition: (types) =>
      !types.has('waf') &&
      (types.has('alb') ||
        types.has('cloudfront') ||
        types.has('api-gateway')),
  },
  {
    type: 'NAT Gateway',
    severity: 'recommended',
    reason:
      'Architecture has a VPC but no NAT Gateway. Private subnets need a NAT Gateway to access the internet for updates and API calls.',
    suggestedService: 'nat-gateway',
    condition: (types, spec) =>
      !types.has('nat-gateway') &&
      spec.groups.some((g) => g.type === 'vpc') &&
      (types.has('ec2') || types.has('ecs') || types.has('rds')),
  },
  {
    type: 'DNS',
    severity: 'recommended',
    reason:
      'Architecture has public-facing services but no DNS management. Route 53 provides reliable and scalable DNS.',
    suggestedService: 'route53',
    condition: (types) =>
      !types.has('route53') &&
      (types.has('cloudfront') || types.has('alb') || types.has('api-gateway')),
  },
  {
    type: 'CDN',
    severity: 'recommended',
    reason:
      'Architecture serves static content via S3 but no CDN. CloudFront reduces latency and data transfer costs.',
    suggestedService: 'cloudfront',
    condition: (types) =>
      !types.has('cloudfront') && types.has('s3') && types.has('alb'),
  },
  {
    type: 'Secrets Management',
    severity: 'recommended',
    reason:
      'Architecture has databases but no secrets management. AWS Secrets Manager securely stores and rotates credentials.',
    suggestedService: 'secrets-manager',
    condition: (types) =>
      !types.has('secrets-manager') &&
      (types.has('rds') || types.has('aurora') || types.has('documentdb')),
  },
  {
    type: 'Audit Logging',
    severity: 'optional',
    reason:
      'Architecture has no audit trail service. CloudTrail records API calls for governance and compliance.',
    suggestedService: 'cloudtrail',
    condition: (types) => !types.has('cloudtrail'),
  },
  {
    type: 'Configuration Compliance',
    severity: 'optional',
    reason:
      'Architecture has no configuration compliance service. AWS Config tracks resource configurations and evaluates compliance rules.',
    suggestedService: 'config',
    condition: (types) => !types.has('config') && types.has('ec2'),
  },
];

/**
 * Detects missing components by comparing the architecture against a reference checklist.
 *
 * @param spec - The architecture specification to analyze
 * @returns Array of missing components with severity and suggested services
 */
export function detectMissingComponents(
  spec: ArchitectureSpec
): MissingComponent[] {
  const serviceTypes = new Set(spec.services.map((s: ServiceNode) => s.type));

  return MISSING_COMPONENT_RULES.filter((rule) =>
    rule.condition(serviceTypes, spec)
  ).map((rule) => ({
    type: rule.type,
    severity: rule.severity,
    reason: rule.reason,
    suggestedService: rule.suggestedService,
  }));
}

/**
 * Performs a complete architecture analysis including:
 * - Missing component detection against reference checklist
 * - Well-Architected Framework pillar evaluation
 * - Security recommendations (up to 10)
 * - High-availability recommendations (up to 10)
 * - Cost optimization recommendations (up to 10)
 *
 * All recommendations are assigned severity levels (Critical, Recommended, Optional)
 * and sorted from Critical to Optional.
 *
 * @param spec - The architecture specification to analyze
 * @returns Complete architecture analysis result
 */
export function analyzeArchitecture(
  spec: ArchitectureSpec
): ArchitectureAnalysis {
  // Evaluate Well-Architected Framework pillars
  const wellArchitected = evaluateWellArchitected(spec);

  // Generate recommendations per category
  const securityRecs = getSecurityRecommendations(spec);
  const haRecs = getHighAvailabilityRecommendations(spec);
  const costRecs = getCostOptimizationRecommendations(spec);

  // Combine all recommendations sorted by severity
  const recommendations: Recommendation[] = [
    ...securityRecs,
    ...haRecs,
    ...costRecs,
  ];

  // Detect missing components
  const missingComponents = detectMissingComponents(spec);

  return {
    wellArchitected,
    recommendations,
    missingComponents,
  };
}
