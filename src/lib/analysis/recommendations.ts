/**
 * Recommendation generators for architecture analysis.
 *
 * Provides up to 10 recommendations per category (security, high-availability,
 * cost-optimization) based on the services present in the architecture.
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';
import type { Recommendation, Severity } from '@/types/analysis';

/** Maximum recommendations per category */
const MAX_RECOMMENDATIONS_PER_CATEGORY = 10;

/**
 * A rule that may produce a recommendation based on architecture state.
 */
interface RecommendationRule {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  /** Returns true if this recommendation applies (i.e. gap detected) */
  condition: (serviceTypes: Set<string>, spec: ArchitectureSpec) => boolean;
  /** Returns affected service IDs when the recommendation applies */
  affectedServices: (spec: ArchitectureSpec) => string[];
}

// --- Security Rules ---

const SECURITY_RULES: RecommendationRule[] = [
  {
    id: 'sec-encryption-at-rest',
    severity: 'critical',
    title: 'Enable encryption at rest',
    description:
      'Data stores should use KMS encryption at rest. Add AWS KMS to manage encryption keys for all storage and database services.',
    condition: (types) => !types.has('kms') && (types.has('s3') || types.has('rds') || types.has('dynamodb') || types.has('ebs')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['s3', 'rds', 'dynamodb', 'ebs', 'aurora', 'efs'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'sec-waf',
    severity: 'critical',
    title: 'Add Web Application Firewall',
    description:
      'Public-facing services should be protected by AWS WAF to guard against common web exploits such as SQL injection and XSS.',
    condition: (types) =>
      !types.has('waf') &&
      (types.has('alb') || types.has('cloudfront') || types.has('api-gateway')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['alb', 'cloudfront', 'api-gateway'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'sec-shield',
    severity: 'recommended',
    title: 'Enable DDoS protection with AWS Shield',
    description:
      'Consider AWS Shield Advanced for enhanced DDoS protection on public-facing resources like CloudFront, ALB, and Route 53.',
    condition: (types) =>
      !types.has('shield') &&
      (types.has('cloudfront') || types.has('alb') || types.has('route53')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['cloudfront', 'alb', 'route53'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'sec-guardduty',
    severity: 'recommended',
    title: 'Enable threat detection with GuardDuty',
    description:
      'AWS GuardDuty provides intelligent threat detection to monitor for malicious activity and unauthorized behavior.',
    condition: (types) => !types.has('guardduty'),
    affectedServices: () => [],
  },
  {
    id: 'sec-secrets',
    severity: 'recommended',
    title: 'Use Secrets Manager for credentials',
    description:
      'Store database credentials, API keys, and other secrets in AWS Secrets Manager with automatic rotation rather than hardcoding.',
    condition: (types) =>
      !types.has('secrets-manager') &&
      (types.has('rds') || types.has('aurora') || types.has('documentdb')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['rds', 'aurora', 'documentdb'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'sec-network-isolation',
    severity: 'critical',
    title: 'Ensure VPC network isolation',
    description:
      'Place compute and database resources inside a VPC with private subnets to restrict network access.',
    condition: (types, spec) =>
      !spec.groups.some((g) => g.type === 'vpc') &&
      (types.has('ec2') || types.has('rds') || types.has('ecs')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['ec2', 'rds', 'ecs', 'eks', 'aurora'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'sec-tls',
    severity: 'critical',
    title: 'Use TLS certificates for in-transit encryption',
    description:
      'Add AWS Certificate Manager to provision and manage TLS certificates for encrypted communication.',
    condition: (types) =>
      !types.has('certificate-manager') &&
      (types.has('alb') || types.has('cloudfront') || types.has('api-gateway')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['alb', 'cloudfront', 'api-gateway'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'sec-inspector',
    severity: 'optional',
    title: 'Enable vulnerability scanning with Inspector',
    description:
      'AWS Inspector provides automated vulnerability assessments for EC2 instances and container images.',
    condition: (types) =>
      !types.has('inspector') && (types.has('ec2') || types.has('ecs') || types.has('ecr')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['ec2', 'ecs', 'ecr'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'sec-macie',
    severity: 'optional',
    title: 'Enable data classification with Macie',
    description:
      'AWS Macie uses machine learning to discover, classify, and protect sensitive data stored in S3.',
    condition: (types) => !types.has('macie') && types.has('s3'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 's3')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'sec-cognito',
    severity: 'recommended',
    title: 'Add user authentication with Cognito',
    description:
      'Add AWS Cognito for managed user authentication and authorization for API-backed applications.',
    condition: (types) =>
      !types.has('cognito') && types.has('api-gateway'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 'api-gateway')
        .map((s: ServiceNode) => s.id),
  },
];

// --- High Availability Rules ---

const HA_RULES: RecommendationRule[] = [
  {
    id: 'ha-multi-az-db',
    severity: 'critical',
    title: 'Enable Multi-AZ for databases',
    description:
      'Deploy database instances across multiple Availability Zones for automatic failover and high availability.',
    condition: (types, spec) => {
      const hasDb = types.has('rds') || types.has('aurora') || types.has('documentdb');
      const hasMultiAz = spec.groups.filter((g) => g.type === 'availability-zone').length >= 2;
      return hasDb && !hasMultiAz;
    },
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['rds', 'aurora', 'documentdb'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'ha-load-balancer',
    severity: 'critical',
    title: 'Add load balancer for compute services',
    description:
      'Distribute traffic across multiple compute instances using an Application Load Balancer for resilience and scaling.',
    condition: (types) =>
      !types.has('alb') && !types.has('nlb') && !types.has('elb') &&
      (types.has('ec2') || types.has('ecs') || types.has('eks')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['ec2', 'ecs', 'eks'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'ha-auto-scaling',
    severity: 'critical',
    title: 'Enable auto-scaling for compute',
    description:
      'Configure auto-scaling policies to automatically adjust capacity based on demand, preventing outages during traffic spikes.',
    condition: (types) =>
      types.has('ec2') && !types.has('fargate') && !types.has('lambda'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 'ec2')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'ha-route53-failover',
    severity: 'recommended',
    title: 'Configure DNS failover with Route 53',
    description:
      'Use Route 53 health checks and DNS failover routing to redirect traffic away from unhealthy endpoints.',
    condition: (types) =>
      !types.has('route53') &&
      (types.has('alb') || types.has('cloudfront') || types.has('ec2')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['alb', 'cloudfront', 'ec2'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'ha-s3-versioning',
    severity: 'recommended',
    title: 'Enable S3 versioning for data durability',
    description:
      'Enable versioning on S3 buckets to protect against accidental deletions and allow easy recovery of previous file versions.',
    condition: (types) => types.has('s3'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 's3')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'ha-backup',
    severity: 'recommended',
    title: 'Implement automated backups with AWS Backup',
    description:
      'Use AWS Backup to centrally manage and automate backups across AWS services including RDS, EBS, EFS, and DynamoDB.',
    condition: (types) =>
      !types.has('backup') &&
      (types.has('rds') || types.has('ebs') || types.has('dynamodb') || types.has('efs')),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['rds', 'ebs', 'dynamodb', 'efs', 'aurora'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'ha-elasticache-replication',
    severity: 'recommended',
    title: 'Enable replication for cache clusters',
    description:
      'Configure ElastiCache with replica nodes across AZs for automatic failover if the primary node fails.',
    condition: (types) => types.has('elasticache'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 'elasticache')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'ha-sqs-dlq',
    severity: 'optional',
    title: 'Add dead-letter queues for message processing',
    description:
      'Configure dead-letter queues on SQS to capture failed messages for troubleshooting without losing data.',
    condition: (types) => types.has('sqs'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 'sqs')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'ha-multi-region',
    severity: 'optional',
    title: 'Consider multi-region deployment',
    description:
      'For mission-critical workloads, consider deploying across multiple AWS regions for disaster recovery.',
    condition: (types) =>
      types.has('route53') && types.has('s3') && !types.has('global-accelerator'),
    affectedServices: () => [],
  },
  {
    id: 'ha-health-checks',
    severity: 'optional',
    title: 'Implement comprehensive health checks',
    description:
      'Configure health checks on load balancers and container orchestrators to detect and route around unhealthy instances.',
    condition: (types) =>
      (types.has('alb') || types.has('ecs')) && !types.has('route53'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['alb', 'ecs', 'ec2'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
];

// --- Cost Optimization Rules ---

const COST_RULES: RecommendationRule[] = [
  {
    id: 'cost-serverless',
    severity: 'recommended',
    title: 'Consider serverless alternatives',
    description:
      'Replace always-on EC2 instances with Lambda or Fargate for variable workloads to pay only for actual usage.',
    condition: (types) =>
      types.has('ec2') && !types.has('lambda') && !types.has('fargate'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 'ec2')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-right-sizing',
    severity: 'recommended',
    title: 'Right-size compute instances',
    description:
      'Review EC2 and RDS instance types to ensure they match actual workload requirements. Over-provisioning wastes resources.',
    condition: (types) => types.has('ec2') || types.has('rds'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['ec2', 'rds'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-reserved',
    severity: 'recommended',
    title: 'Use Reserved Instances or Savings Plans',
    description:
      'For steady-state workloads, commit to Reserved Instances or Savings Plans for up to 72% cost savings over On-Demand.',
    condition: (types) => types.has('ec2') || types.has('rds') || types.has('elasticache'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['ec2', 'rds', 'elasticache', 'aurora'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-s3-lifecycle',
    severity: 'recommended',
    title: 'Configure S3 lifecycle policies',
    description:
      'Move infrequently accessed objects to cheaper storage classes (S3 IA, Glacier) using lifecycle rules.',
    condition: (types) => types.has('s3'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 's3')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-cdn',
    severity: 'recommended',
    title: 'Use CloudFront CDN to reduce data transfer costs',
    description:
      'Serve static content through CloudFront to reduce origin requests and lower data transfer charges.',
    condition: (types) =>
      !types.has('cloudfront') && types.has('s3'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 's3')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-dynamodb-on-demand',
    severity: 'optional',
    title: 'Evaluate DynamoDB capacity mode',
    description:
      'Use on-demand capacity for unpredictable workloads or provisioned capacity with auto-scaling for steady traffic to optimize costs.',
    condition: (types) => types.has('dynamodb'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 'dynamodb')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-nat-gateway',
    severity: 'recommended',
    title: 'Minimize NAT Gateway data processing costs',
    description:
      'NAT Gateway charges per GB processed. Use VPC endpoints for S3 and DynamoDB to avoid NAT costs for AWS service traffic.',
    condition: (types) => types.has('nat-gateway'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => s.type === 'nat-gateway')
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-graviton',
    severity: 'optional',
    title: 'Consider Graviton (ARM) instances',
    description:
      'AWS Graviton processors offer up to 40% better price-performance than x86 equivalents for many workloads.',
    condition: (types) => types.has('ec2') || types.has('rds') || types.has('elasticache'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['ec2', 'rds', 'elasticache'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-spot',
    severity: 'optional',
    title: 'Use Spot Instances for fault-tolerant workloads',
    description:
      'Spot Instances offer up to 90% discount for workloads that tolerate interruptions (batch processing, CI/CD, analytics).',
    condition: (types) => types.has('ec2') || types.has('batch') || types.has('emr'),
    affectedServices: (spec) =>
      spec.services
        .filter((s: ServiceNode) => ['ec2', 'batch', 'emr'].includes(s.type))
        .map((s: ServiceNode) => s.id),
  },
  {
    id: 'cost-monitoring',
    severity: 'optional',
    title: 'Set up cost monitoring and alerts',
    description:
      'Use AWS Budgets and CloudWatch billing alarms to monitor spending and receive alerts before costs exceed expectations.',
    condition: (types) => !types.has('cloudwatch'),
    affectedServices: () => [],
  },
];

/**
 * Generates security recommendations for an architecture.
 * Returns up to 10 recommendations sorted by severity (critical first).
 *
 * @param spec - The architecture specification to analyze
 * @returns Array of security recommendations (max 10)
 */
export function getSecurityRecommendations(
  spec: ArchitectureSpec
): Recommendation[] {
  return evaluateRules(SECURITY_RULES, spec, 'security');
}

/**
 * Generates high-availability recommendations for an architecture.
 * Returns up to 10 recommendations sorted by severity (critical first).
 *
 * @param spec - The architecture specification to analyze
 * @returns Array of high-availability recommendations (max 10)
 */
export function getHighAvailabilityRecommendations(
  spec: ArchitectureSpec
): Recommendation[] {
  return evaluateRules(HA_RULES, spec, 'high-availability');
}

/**
 * Generates cost optimization recommendations for an architecture.
 * Returns up to 10 recommendations sorted by severity (critical first).
 *
 * @param spec - The architecture specification to analyze
 * @returns Array of cost optimization recommendations (max 10)
 */
export function getCostOptimizationRecommendations(
  spec: ArchitectureSpec
): Recommendation[] {
  return evaluateRules(COST_RULES, spec, 'cost-optimization');
}

/**
 * Evaluates recommendation rules against an architecture and returns
 * matching recommendations, sorted by severity and capped at MAX_RECOMMENDATIONS_PER_CATEGORY.
 */
function evaluateRules(
  rules: RecommendationRule[],
  spec: ArchitectureSpec,
  category: Recommendation['category']
): Recommendation[] {
  const serviceTypes = new Set(spec.services.map((s: ServiceNode) => s.type));

  const recommendations: Recommendation[] = rules
    .filter((rule) => rule.condition(serviceTypes, spec))
    .map((rule) => ({
      id: rule.id,
      category,
      severity: rule.severity,
      title: rule.title,
      description: rule.description,
      affectedServices: rule.affectedServices(spec),
    }));

  // Sort by severity: critical > recommended > optional
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    recommended: 1,
    optional: 2,
  };

  recommendations.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return recommendations.slice(0, MAX_RECOMMENDATIONS_PER_CATEGORY);
}
