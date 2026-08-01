/**
 * Best practice recommendation rules mapped to architecture patterns.
 *
 * Each rule checks for the presence of certain services or patterns
 * and produces a recommendation aligned with the AWS Well-Architected Framework.
 *
 * Validates: Requirements 8.3
 */

import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';
import type { AWSServiceType } from '@/types/architecture';

/**
 * A best practice recommendation aligned to the Well-Architected Framework.
 */
export interface BestPracticeRecommendation {
  /** The recommendation text in plain language */
  text: string;
  /** Which Well-Architected pillar this aligns with */
  pillar:
    | 'operational-excellence'
    | 'security'
    | 'reliability'
    | 'performance-efficiency'
    | 'cost-optimization'
    | 'sustainability';
}

/**
 * A rule that evaluates an architecture and optionally produces a recommendation.
 */
interface BestPracticeRule {
  /** Evaluate the architecture and return a recommendation if applicable */
  evaluate(spec: ArchitectureSpec): BestPracticeRecommendation | null;
}

/**
 * Helper to check if a service type exists in the architecture.
 */
function hasService(services: ServiceNode[], type: AWSServiceType): boolean {
  return services.some((s) => s.type === type);
}

/**
 * Helper to check if any service from a list of types exists.
 */
function hasAnyService(services: ServiceNode[], types: AWSServiceType[]): boolean {
  return types.some((t) => hasService(services, t));
}

/**
 * All best practice rules. Each evaluates an architecture spec and returns
 * a recommendation if the pattern is detected.
 */
const BEST_PRACTICE_RULES: BestPracticeRule[] = [
  // Security: Suggest encryption at rest with KMS
  {
    evaluate(spec) {
      const hasDataStore = hasAnyService(spec.services, [
        's3', 'rds', 'aurora', 'dynamodb', 'elasticache', 'redshift',
        'neptune', 'documentdb', 'efs', 'ebs',
      ]);
      const hasKms = hasService(spec.services, 'kms');
      if (hasDataStore && !hasKms) {
        return {
          text: 'Consider using AWS Key Management Service (KMS) to encrypt data at rest for your storage and database services.',
          pillar: 'security',
        };
      }
      return null;
    },
  },
  // Security: Suggest WAF for public-facing endpoints
  {
    evaluate(spec) {
      const hasPublicEndpoint = hasAnyService(spec.services, [
        'cloudfront', 'alb', 'api-gateway', 'elb',
      ]);
      const hasWaf = hasService(spec.services, 'waf');
      if (hasPublicEndpoint && !hasWaf) {
        return {
          text: 'Consider adding AWS Web Application Firewall (WAF) to protect your public-facing endpoints from common web exploits.',
          pillar: 'security',
        };
      }
      return null;
    },
  },
  // Reliability: Suggest multi-AZ for databases
  {
    evaluate(spec) {
      const hasDb = hasAnyService(spec.services, ['rds', 'aurora', 'documentdb', 'neptune']);
      const multiAzGroups = spec.groups.filter(
        (g) => g.type === 'availability-zone'
      );
      if (hasDb && multiAzGroups.length < 2) {
        return {
          text: 'Consider deploying database instances across multiple Availability Zones for higher fault tolerance and automatic failover.',
          pillar: 'reliability',
        };
      }
      return null;
    },
  },
  // Reliability: Suggest auto-scaling for compute
  {
    evaluate(spec) {
      const hasCompute = hasAnyService(spec.services, ['ec2', 'ecs', 'eks']);
      if (hasCompute) {
        return {
          text: 'Consider configuring Auto Scaling groups for your compute instances to handle traffic spikes and maintain availability during demand changes.',
          pillar: 'reliability',
        };
      }
      return null;
    },
  },
  // Performance: Suggest CloudFront for static assets
  {
    evaluate(spec) {
      const hasS3 = hasService(spec.services, 's3');
      const hasCf = hasService(spec.services, 'cloudfront');
      if (hasS3 && !hasCf) {
        return {
          text: 'Consider placing Amazon CloudFront in front of your S3 buckets to cache static assets at edge locations and reduce latency for global users.',
          pillar: 'performance-efficiency',
        };
      }
      return null;
    },
  },
  // Performance: Suggest ElastiCache for frequently accessed data
  {
    evaluate(spec) {
      const hasDb = hasAnyService(spec.services, ['rds', 'aurora', 'dynamodb']);
      const hasCache = hasAnyService(spec.services, ['elasticache', 'memorydb']);
      if (hasDb && !hasCache) {
        return {
          text: 'Consider adding Amazon ElastiCache between your application and database to reduce read latency and offload repetitive queries.',
          pillar: 'performance-efficiency',
        };
      }
      return null;
    },
  },
  // Cost: Suggest DynamoDB auto-scaling
  {
    evaluate(spec) {
      const hasDynamo = hasService(spec.services, 'dynamodb');
      if (hasDynamo) {
        return {
          text: 'Use DynamoDB on-demand capacity or auto-scaling to match throughput to actual usage and avoid over-provisioning costs.',
          pillar: 'cost-optimization',
        };
      }
      return null;
    },
  },
  // Cost: Suggest Savings Plans for steady workloads
  {
    evaluate(spec) {
      const hasSteadyCompute = hasAnyService(spec.services, ['ec2', 'fargate', 'lambda']);
      if (hasSteadyCompute) {
        return {
          text: 'Evaluate AWS Savings Plans or Reserved Instances for predictable compute workloads to reduce costs by up to 72% compared to On-Demand pricing.',
          pillar: 'cost-optimization',
        };
      }
      return null;
    },
  },
  // Operational Excellence: Suggest CloudWatch monitoring
  {
    evaluate(spec) {
      const hasWorkload = spec.services.length > 0;
      const hasMonitoring = hasService(spec.services, 'cloudwatch');
      if (hasWorkload && !hasMonitoring) {
        return {
          text: 'Consider adding Amazon CloudWatch for centralized monitoring, logging, and alerting across all services in your architecture.',
          pillar: 'operational-excellence',
        };
      }
      return null;
    },
  },
  // Operational Excellence: Suggest CloudTrail for auditing
  {
    evaluate(spec) {
      const hasWorkload = spec.services.length > 0;
      const hasTrail = hasService(spec.services, 'cloudtrail');
      if (hasWorkload && !hasTrail) {
        return {
          text: 'Consider enabling AWS CloudTrail to log all API calls for audit, compliance, and operational troubleshooting.',
          pillar: 'operational-excellence',
        };
      }
      return null;
    },
  },
  // Security: Suggest Secrets Manager for credential management
  {
    evaluate(spec) {
      const hasDb = hasAnyService(spec.services, ['rds', 'aurora', 'documentdb', 'redshift']);
      const hasSecretsManager = hasService(spec.services, 'secrets-manager');
      if (hasDb && !hasSecretsManager) {
        return {
          text: 'Consider using AWS Secrets Manager to securely store and automatically rotate database credentials.',
          pillar: 'security',
        };
      }
      return null;
    },
  },
  // Sustainability: Suggest serverless where applicable
  {
    evaluate(spec) {
      const hasEc2 = hasService(spec.services, 'ec2');
      const hasLambda = hasService(spec.services, 'lambda');
      if (hasEc2 && !hasLambda) {
        return {
          text: 'Evaluate whether any EC2 workloads could be migrated to AWS Lambda or Fargate to reduce idle resource consumption and improve sustainability.',
          pillar: 'sustainability',
        };
      }
      return null;
    },
  },
  // Reliability: Suggest Route 53 health checks
  {
    evaluate(spec) {
      const hasMultipleEndpoints = hasAnyService(spec.services, ['alb', 'nlb', 'elb', 'cloudfront']);
      const hasRoute53 = hasService(spec.services, 'route53');
      if (hasMultipleEndpoints && !hasRoute53) {
        return {
          text: 'Consider using Amazon Route 53 with health checks for DNS-level failover to improve reliability of your public endpoints.',
          pillar: 'reliability',
        };
      }
      return null;
    },
  },
  // Performance: Suggest API Gateway caching
  {
    evaluate(spec) {
      const hasApiGw = hasService(spec.services, 'api-gateway');
      if (hasApiGw) {
        return {
          text: 'Enable API Gateway response caching to reduce backend calls and improve response times for frequently requested resources.',
          pillar: 'performance-efficiency',
        };
      }
      return null;
    },
  },
  // Security: Suggest VPC for network isolation
  {
    evaluate(spec) {
      const hasCompute = hasAnyService(spec.services, ['ec2', 'ecs', 'eks', 'rds', 'aurora']);
      const hasVpc = spec.groups.some((g) => g.type === 'vpc');
      if (hasCompute && !hasVpc) {
        return {
          text: 'Consider placing compute and database resources within an Amazon Virtual Private Cloud (VPC) for network isolation and security group control.',
          pillar: 'security',
        };
      }
      return null;
    },
  },
];

/**
 * Generate up to `maxRecommendations` best practice recommendations for
 * the given architecture specification.
 *
 * @param spec - The architecture specification to analyze
 * @param maxRecommendations - Maximum number of recommendations to return (default: 10)
 * @returns Array of best practice recommendation strings
 */
export function generateBestPractices(
  spec: ArchitectureSpec,
  maxRecommendations: number = 10
): string[] {
  const recommendations: string[] = [];

  for (const rule of BEST_PRACTICE_RULES) {
    if (recommendations.length >= maxRecommendations) break;

    const result = rule.evaluate(spec);
    if (result) {
      recommendations.push(result.text);
    }
  }

  return recommendations;
}
