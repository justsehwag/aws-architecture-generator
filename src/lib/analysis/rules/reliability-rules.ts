/**
 * Reliability / High-Availability analysis rules.
 *
 * Generates recommendations for multi-AZ deployments, auto-scaling,
 * failover, and other reliability patterns.
 *
 * Validates: Requirement 6.4
 */

import type { ArchitectureSpec } from '@/types/architecture';
import type { Recommendation, Severity } from '@/types/analysis';

/**
 * A reliability rule definition that checks the architecture and optionally
 * produces a recommendation.
 */
interface ReliabilityRule {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  /** Returns affected service IDs if the rule is triggered, or empty array if not applicable */
  check: (spec: ArchitectureSpec) => string[];
}

const RELIABILITY_RULES: ReliabilityRule[] = [
  {
    id: 'ha-001',
    title: 'Deploy databases in Multi-AZ configuration',
    description:
      'Database services should use Multi-AZ deployments for automatic failover. This ensures high availability and data durability.',
    severity: 'critical',
    check: (spec) => {
      const dbTypes = ['rds', 'aurora', 'elasticache', 'redshift', 'documentdb', 'neptune'];
      const hasMultiAz = spec.groups.filter((g) => g.type === 'availability-zone').length >= 2;
      if (hasMultiAz) return [];
      return spec.services
        .filter((s) => dbTypes.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'ha-002',
    title: 'Implement auto-scaling for compute resources',
    description:
      'Compute services should use auto-scaling to handle traffic spikes and maintain performance during peak demand.',
    severity: 'critical',
    check: (spec) => {
      const computeTypes = ['ec2', 'ecs', 'eks', 'fargate'];
      const hasAutoScaling = spec.services.some(
        (s) =>
          s.properties?.['autoScaling'] === 'true' ||
          s.label.toLowerCase().includes('auto scaling') ||
          s.label.toLowerCase().includes('asg')
      );
      if (hasAutoScaling) return [];
      return spec.services
        .filter((s) => computeTypes.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'ha-003',
    title: 'Use multiple Availability Zones',
    description:
      'Deploy workloads across at least 2 Availability Zones to protect against AZ-level failures and ensure regional resilience.',
    severity: 'critical',
    check: (spec) => {
      const azCount = spec.groups.filter((g) => g.type === 'availability-zone').length;
      if (azCount >= 2) return [];
      // Flag compute and database services that should be multi-AZ
      const needsMultiAz = ['ec2', 'ecs', 'eks', 'rds', 'aurora', 'elasticache'];
      return spec.services
        .filter((s) => needsMultiAz.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'ha-004',
    title: 'Add health checks and failover routing',
    description:
      'Implement health checks on load balancers and Route 53 failover routing to automatically redirect traffic from unhealthy instances.',
    severity: 'recommended',
    check: (spec) => {
      const hasLb = spec.services.some((s) =>
        ['alb', 'nlb', 'elb'].includes(s.type)
      );
      const hasRoute53 = spec.services.some((s) => s.type === 'route53');
      if (hasLb && hasRoute53) return [];
      const computeServices = spec.services.filter((s) =>
        ['ec2', 'ecs', 'eks', 'fargate'].includes(s.type)
      );
      return computeServices.map((s) => s.id);
    },
  },
  {
    id: 'ha-005',
    title: 'Implement read replicas for databases',
    description:
      'Use read replicas to offload read traffic from the primary database, improving performance and providing a failover target.',
    severity: 'recommended',
    check: (spec) => {
      const dbs = spec.services.filter((s) =>
        ['rds', 'aurora', 'documentdb'].includes(s.type)
      );
      if (dbs.length === 0) return [];
      // Check if there are multiple DB instances suggesting replicas
      const dbTypes = dbs.map((s) => s.type);
      const hasReplica = new Set(dbTypes).size < dbTypes.length;
      if (hasReplica) return [];
      return dbs.map((s) => s.id);
    },
  },
  {
    id: 'ha-006',
    title: 'Use SQS dead-letter queues for async processing',
    description:
      'Configure dead-letter queues (DLQ) for SQS queues and Lambda functions to capture failed messages and prevent data loss.',
    severity: 'recommended',
    check: (spec) => {
      const hasSqs = spec.services.filter((s) => s.type === 'sqs');
      const hasLambda = spec.services.filter((s) => s.type === 'lambda');
      if (hasSqs.length === 0 && hasLambda.length === 0) return [];
      // Check if there are DLQ indicators
      const hasDlq = spec.services.some(
        (s) =>
          s.label.toLowerCase().includes('dlq') ||
          s.label.toLowerCase().includes('dead letter')
      );
      if (hasDlq) return [];
      return [...hasSqs, ...hasLambda].map((s) => s.id);
    },
  },
  {
    id: 'ha-007',
    title: 'Implement circuit breaker pattern',
    description:
      'Use circuit breakers (via Step Functions or application-level patterns) to prevent cascading failures when downstream services are unavailable.',
    severity: 'recommended',
    check: (spec) => {
      const hasStepFunctions = spec.services.some(
        (s) => s.type === 'step-functions'
      );
      if (hasStepFunctions) return [];
      // Recommend for architectures with multiple service-to-service calls
      if (spec.connections.length >= 5) {
        return spec.services.slice(0, 3).map((s) => s.id);
      }
      return [];
    },
  },
  {
    id: 'ha-008',
    title: 'Enable S3 cross-region replication',
    description:
      'For critical data stored in S3, enable cross-region replication to protect against regional outages and meet compliance requirements.',
    severity: 'optional',
    check: (spec) => {
      return spec.services
        .filter((s) => s.type === 's3')
        .map((s) => s.id);
    },
  },
  {
    id: 'ha-009',
    title: 'Use ElastiCache for session management',
    description:
      'Store session state in ElastiCache (Redis/Memcached) for stateless compute instances, enabling seamless failover between instances.',
    severity: 'optional',
    check: (spec) => {
      const hasCache = spec.services.some(
        (s) => s.type === 'elasticache' || s.type === 'memorydb'
      );
      if (hasCache) return [];
      const hasCompute = spec.services.filter((s) =>
        ['ec2', 'ecs', 'eks'].includes(s.type)
      );
      if (hasCompute.length >= 2) {
        return hasCompute.map((s) => s.id);
      }
      return [];
    },
  },
  {
    id: 'ha-010',
    title: 'Implement Global Accelerator for multi-region',
    description:
      'AWS Global Accelerator improves availability by routing traffic to the nearest healthy endpoint across multiple AWS regions.',
    severity: 'optional',
    check: (spec) => {
      const hasGa = spec.services.some((s) => s.type === 'global-accelerator');
      if (hasGa) return [];
      // Only recommend for larger architectures
      if (spec.services.length >= 8) {
        const publicFacing = spec.services.filter((s) =>
          ['alb', 'nlb', 'elb', 'cloudfront'].includes(s.type)
        );
        return publicFacing.map((s) => s.id);
      }
      return [];
    },
  },
];

/**
 * Generates high-availability recommendations for the architecture.
 * Returns up to 10 recommendations sorted by severity.
 *
 * @param spec - The architecture specification to analyze
 * @returns Array of high-availability recommendations (max 10)
 */
export function analyzeReliabilityRules(
  spec: ArchitectureSpec
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const rule of RELIABILITY_RULES) {
    const affectedServices = rule.check(spec);
    if (affectedServices.length > 0) {
      recommendations.push({
        id: rule.id,
        category: 'high-availability',
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

  // Return at most 10 recommendations (Requirement 6.4)
  return recommendations.slice(0, 10);
}
