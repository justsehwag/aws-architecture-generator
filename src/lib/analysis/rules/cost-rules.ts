/**
 * Cost optimization analysis rules.
 *
 * Generates recommendations for right-sizing, reserved capacity,
 * serverless alternatives, and Graviton processors.
 *
 * Validates: Requirement 6.5
 */

import type { ArchitectureSpec } from '@/types/architecture';
import type { Recommendation, Severity } from '@/types/analysis';

/**
 * A cost optimization rule definition.
 */
interface CostRule {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  /** Returns affected service IDs if the rule is triggered, or empty array if not applicable */
  check: (spec: ArchitectureSpec) => string[];
}

const COST_RULES: CostRule[] = [
  {
    id: 'cost-001',
    title: 'Consider serverless alternatives for compute',
    description:
      'Replace EC2 instances with Lambda, Fargate, or App Runner for variable workloads to eliminate idle capacity costs and reduce operational overhead.',
    severity: 'recommended',
    check: (spec) => {
      const hasEc2 = spec.services.filter((s) => s.type === 'ec2');
      const hasServerless = spec.services.some((s) =>
        ['lambda', 'fargate', 'app-runner'].includes(s.type)
      );
      if (hasServerless || hasEc2.length === 0) return [];
      return hasEc2.map((s) => s.id);
    },
  },
  {
    id: 'cost-002',
    title: 'Use Reserved Instances or Savings Plans',
    description:
      'For steady-state workloads, use Reserved Instances or Compute Savings Plans to reduce costs by up to 72% compared to On-Demand pricing.',
    severity: 'recommended',
    check: (spec) => {
      const steadyState = ['ec2', 'rds', 'aurora', 'elasticache', 'redshift'];
      return spec.services
        .filter((s) => steadyState.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'cost-003',
    title: 'Consider Graviton-based instances',
    description:
      'AWS Graviton processors deliver up to 40% better price-performance. Consider migrating EC2, RDS, and ElastiCache to Graviton instance families (e.g., m7g, r7g, c7g).',
    severity: 'recommended',
    check: (spec) => {
      const gravitonEligible = ['ec2', 'rds', 'aurora', 'elasticache', 'ecs', 'eks'];
      const eligibleServices = spec.services.filter((s) =>
        gravitonEligible.includes(s.type)
      );
      // Don't flag if they already reference Graviton in properties
      const filtered = eligibleServices.filter(
        (s) =>
          !s.properties?.['instanceType']?.includes('g') &&
          !s.label.toLowerCase().includes('graviton')
      );
      return filtered.map((s) => s.id);
    },
  },
  {
    id: 'cost-004',
    title: 'Use S3 Intelligent-Tiering for variable access patterns',
    description:
      'S3 Intelligent-Tiering automatically moves data between access tiers when access patterns change, optimizing storage costs without performance impact.',
    severity: 'optional',
    check: (spec) => {
      return spec.services
        .filter((s) => s.type === 's3')
        .map((s) => s.id);
    },
  },
  {
    id: 'cost-005',
    title: 'Right-size database instances',
    description:
      'Review database instance types and reduce over-provisioned capacity. Use Performance Insights and CloudWatch metrics to identify right-sizing opportunities.',
    severity: 'recommended',
    check: (spec) => {
      const dbTypes = ['rds', 'aurora', 'elasticache', 'redshift'];
      return spec.services
        .filter((s) => dbTypes.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'cost-006',
    title: 'Use NAT Gateway efficiently',
    description:
      'NAT Gateways incur hourly and data processing charges. Consider consolidating NAT Gateways, using VPC endpoints for AWS services, or Gateway Endpoints for S3/DynamoDB.',
    severity: 'optional',
    check: (spec) => {
      const natGateways = spec.services.filter((s) => s.type === 'nat-gateway');
      if (natGateways.length === 0) return [];
      // Check for VPC endpoints
      const hasVpcEndpoint = spec.services.some(
        (s) =>
          s.label.toLowerCase().includes('endpoint') ||
          s.label.toLowerCase().includes('privatelink')
      );
      if (hasVpcEndpoint) return [];
      return natGateways.map((s) => s.id);
    },
  },
  {
    id: 'cost-007',
    title: 'Use Spot Instances for fault-tolerant workloads',
    description:
      'Spot Instances offer up to 90% discount for interruptible workloads. Use them for batch processing, CI/CD, containerized microservices, and dev/test environments.',
    severity: 'optional',
    check: (spec) => {
      const spotEligible = ['ec2', 'batch', 'emr'];
      return spec.services
        .filter((s) => spotEligible.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'cost-008',
    title: 'Consolidate monitoring to CloudWatch',
    description:
      'Use CloudWatch for centralized logging, metrics, and dashboards to avoid duplication with third-party tools and reduce operational costs.',
    severity: 'optional',
    check: (spec) => {
      const hasCloudWatch = spec.services.some((s) => s.type === 'cloudwatch');
      if (hasCloudWatch) return [];
      if (spec.services.length >= 5) {
        return spec.services.slice(0, 3).map((s) => s.id);
      }
      return [];
    },
  },
  {
    id: 'cost-009',
    title: 'Use DynamoDB On-Demand for variable workloads',
    description:
      'For tables with unpredictable traffic, DynamoDB On-Demand capacity mode charges per request and scales automatically, avoiding over-provisioned capacity.',
    severity: 'optional',
    check: (spec) => {
      return spec.services
        .filter((s) => s.type === 'dynamodb')
        .map((s) => s.id);
    },
  },
  {
    id: 'cost-010',
    title: 'Use Aurora Serverless for intermittent workloads',
    description:
      'Aurora Serverless v2 scales capacity automatically and charges per ACU-second. Ideal for development environments, infrequent or cyclical workloads.',
    severity: 'optional',
    check: (spec) => {
      const auroraServices = spec.services.filter((s) => s.type === 'aurora');
      if (auroraServices.length === 0) return [];
      const isServerless = auroraServices.some(
        (s) =>
          s.label.toLowerCase().includes('serverless') ||
          s.properties?.['mode'] === 'serverless'
      );
      if (isServerless) return [];
      return auroraServices.map((s) => s.id);
    },
  },
];

/**
 * Generates cost optimization recommendations for the architecture.
 * Returns up to 10 recommendations sorted by severity.
 *
 * @param spec - The architecture specification to analyze
 * @returns Array of cost optimization recommendations (max 10)
 */
export function analyzeCostRules(
  spec: ArchitectureSpec
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const rule of COST_RULES) {
    const affectedServices = rule.check(spec);
    if (affectedServices.length > 0) {
      recommendations.push({
        id: rule.id,
        category: 'cost-optimization',
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        affectedServices,
      });
    }
  }

  // Sort by severity: critical > recommended > optional
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    recommended: 1,
    optional: 2,
  };
  recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Return at most 10 recommendations (Requirement 6.5)
  return recommendations.slice(0, 10);
}
