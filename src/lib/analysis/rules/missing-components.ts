/**
 * Missing component detection rules.
 *
 * Checks the architecture against a reference checklist of common infrastructure
 * components and suggests additions with appropriate severity levels.
 *
 * Validates: Requirement 6.1
 */

import type { AWSServiceType, ArchitectureSpec } from '@/types/architecture';
import type { MissingComponent } from '@/types/analysis';

/**
 * A rule that checks for a missing infrastructure component.
 */
interface MissingComponentRule {
  /** Human-readable component type/name */
  type: string;
  /** Service types that satisfy this requirement */
  satisfiedBy: AWSServiceType[];
  /** Severity if missing */
  severity: MissingComponent['severity'];
  /** Reason the component is recommended */
  reason: string;
  /** The suggested AWS service to add */
  suggestedService: AWSServiceType;
  /** Optional condition: only check if these service types are present */
  applicableWhen?: (spec: ArchitectureSpec) => boolean;
}

/**
 * Reference checklist of common infrastructure components.
 * Each rule checks whether a category of service is present in the architecture.
 */
const MISSING_COMPONENT_RULES: MissingComponentRule[] = [
  {
    type: 'Load Balancer',
    satisfiedBy: ['elb', 'alb', 'nlb'],
    severity: 'critical',
    reason:
      'No load balancer detected. A load balancer distributes traffic across instances, improving availability and fault tolerance.',
    suggestedService: 'alb',
    applicableWhen: (spec) =>
      spec.services.some((s) =>
        ['ec2', 'ecs', 'eks', 'fargate'].includes(s.type)
      ),
  },
  {
    type: 'NAT Gateway',
    satisfiedBy: ['nat-gateway'],
    severity: 'recommended',
    reason:
      'No NAT gateway detected. Private subnets require a NAT gateway for outbound internet access while remaining unreachable from the internet.',
    suggestedService: 'nat-gateway',
    applicableWhen: (spec) =>
      spec.groups.some(
        (g) => g.type === 'subnet' && g.label.toLowerCase().includes('private')
      ),
  },
  {
    type: 'Monitoring',
    satisfiedBy: ['cloudwatch'],
    severity: 'critical',
    reason:
      'No monitoring service detected. CloudWatch provides metrics, logs, and alarms essential for operational visibility and incident response.',
    suggestedService: 'cloudwatch',
  },
  {
    type: 'DNS',
    satisfiedBy: ['route53'],
    severity: 'recommended',
    reason:
      'No DNS service detected. Route 53 provides reliable DNS resolution, health checks, and domain management.',
    suggestedService: 'route53',
  },
  {
    type: 'CDN',
    satisfiedBy: ['cloudfront'],
    severity: 'optional',
    reason:
      'No CDN detected. CloudFront reduces latency by caching content at edge locations and provides DDoS protection.',
    suggestedService: 'cloudfront',
    applicableWhen: (spec) =>
      spec.services.some((s) => ['s3', 'alb', 'elb', 'nlb', 'api-gateway'].includes(s.type)),
  },
  {
    type: 'Backup Service',
    satisfiedBy: ['backup'],
    severity: 'recommended',
    reason:
      'No backup service detected. AWS Backup provides centralized, automated backup management for data protection and compliance.',
    suggestedService: 'backup',
    applicableWhen: (spec) =>
      spec.services.some((s) =>
        ['rds', 'aurora', 'dynamodb', 'ebs', 'efs', 's3'].includes(s.type)
      ),
  },
  {
    type: 'WAF (Web Application Firewall)',
    satisfiedBy: ['waf'],
    severity: 'recommended',
    reason:
      'No web application firewall detected. WAF protects web applications from common exploits like SQL injection and XSS.',
    suggestedService: 'waf',
    applicableWhen: (spec) =>
      spec.services.some((s) =>
        ['alb', 'api-gateway', 'cloudfront'].includes(s.type)
      ),
  },
  {
    type: 'Secrets Management',
    satisfiedBy: ['secrets-manager', 'kms'],
    severity: 'recommended',
    reason:
      'No secrets management service detected. Secrets Manager or KMS should be used to securely store and rotate credentials and encryption keys.',
    suggestedService: 'secrets-manager',
    applicableWhen: (spec) =>
      spec.services.some((s) =>
        ['rds', 'aurora', 'lambda', 'ecs', 'eks'].includes(s.type)
      ),
  },
  {
    type: 'VPC',
    satisfiedBy: ['vpc'],
    severity: 'critical',
    reason:
      'No VPC detected. A VPC provides network isolation and is required for most AWS compute and database services.',
    suggestedService: 'vpc',
    applicableWhen: (spec) =>
      spec.services.some((s) =>
        ['ec2', 'rds', 'aurora', 'ecs', 'eks', 'elasticache', 'redshift'].includes(s.type)
      ),
  },
  {
    type: 'Auto Scaling',
    satisfiedBy: ['ec2'], // EC2 Auto Scaling is implied by EC2 presence with ASG properties
    severity: 'optional',
    reason:
      'Consider adding auto-scaling to handle variable traffic loads and improve cost efficiency.',
    suggestedService: 'ec2',
    applicableWhen: (spec) => {
      const hasCompute = spec.services.some((s) =>
        ['ec2', 'ecs', 'eks'].includes(s.type)
      );
      const hasScaling = spec.services.some(
        (s) =>
          s.properties?.['autoScaling'] === 'true' ||
          s.label.toLowerCase().includes('auto scaling')
      );
      return hasCompute && !hasScaling;
    },
  },
];

/**
 * Detects missing infrastructure components by comparing the architecture
 * against a reference checklist of common components.
 *
 * @param spec - The architecture specification to analyze
 * @returns Array of missing components with severity and suggestions
 */
export function detectMissingComponents(
  spec: ArchitectureSpec
): MissingComponent[] {
  const serviceTypes = new Set(spec.services.map((s) => s.type));
  const missing: MissingComponent[] = [];

  for (const rule of MISSING_COMPONENT_RULES) {
    // Skip rules that don't apply to this architecture
    if (rule.applicableWhen && !rule.applicableWhen(spec)) {
      continue;
    }

    // Check if any of the satisfying services are present
    const isSatisfied = rule.satisfiedBy.some((type) => serviceTypes.has(type));

    if (!isSatisfied) {
      missing.push({
        type: rule.type,
        severity: rule.severity,
        reason: rule.reason,
        suggestedService: rule.suggestedService,
      });
    }
  }

  return missing;
}
