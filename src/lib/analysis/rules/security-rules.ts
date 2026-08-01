/**
 * Security analysis rules.
 *
 * Generates recommendations for encryption, IAM, WAF, and network isolation
 * based on the services present in the architecture.
 *
 * Validates: Requirement 6.3
 */

import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';
import type { Recommendation, Severity } from '@/types/analysis';

/**
 * A security rule definition that checks the architecture and optionally
 * produces a recommendation.
 */
interface SecurityRule {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  /** Returns affected service IDs if the rule is triggered, or empty array if not applicable */
  check: (spec: ArchitectureSpec) => string[];
}

const SECURITY_RULES: SecurityRule[] = [
  {
    id: 'sec-001',
    title: 'Enable encryption at rest for databases',
    description:
      'Database services (RDS, Aurora, DynamoDB, ElastiCache) should have encryption at rest enabled using AWS KMS to protect sensitive data.',
    severity: 'critical',
    check: (spec) => {
      const dbTypes = ['rds', 'aurora', 'dynamodb', 'elasticache', 'redshift', 'neptune', 'documentdb'];
      const hasKms = spec.services.some((s) => s.type === 'kms');
      if (hasKms) return [];
      return spec.services
        .filter((s) => dbTypes.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'sec-002',
    title: 'Enable encryption in transit (TLS/SSL)',
    description:
      'All data in transit between services should be encrypted using TLS/SSL. Ensure HTTPS endpoints and encrypted connections between components.',
    severity: 'critical',
    check: (spec) => {
      const hasCert = spec.services.some((s) => s.type === 'certificate-manager');
      if (hasCert) return [];
      // Check if there are any connections without HTTPS/TLS
      const unencryptedConnections = spec.connections.filter(
        (c) => c.protocol && !['https', 'tls', 'ssl'].includes(c.protocol.toLowerCase())
      );
      if (unencryptedConnections.length === 0 && spec.connections.length === 0) {
        return spec.services.map((s) => s.id).slice(0, 3);
      }
      return unencryptedConnections.map((c) => c.sourceId);
    },
  },
  {
    id: 'sec-003',
    title: 'Add WAF for public-facing endpoints',
    description:
      'Web Application Firewall (WAF) should protect public-facing resources like ALB, API Gateway, and CloudFront from common web exploits.',
    severity: 'critical',
    check: (spec) => {
      const publicFacing = ['alb', 'api-gateway', 'cloudfront'];
      const hasWaf = spec.services.some((s) => s.type === 'waf');
      if (hasWaf) return [];
      return spec.services
        .filter((s) => publicFacing.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'sec-004',
    title: 'Implement least-privilege IAM policies',
    description:
      'Ensure IAM roles and policies follow the principle of least privilege. Each service should have narrowly scoped permissions.',
    severity: 'recommended',
    check: (spec) => {
      const hasIam = spec.services.some((s) => s.type === 'iam');
      if (hasIam) return [];
      // If there are Lambda, ECS, or EKS services without IAM, flag them
      const needsIam = ['lambda', 'ecs', 'eks', 'ec2', 'fargate'];
      return spec.services
        .filter((s) => needsIam.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'sec-005',
    title: 'Enable VPC network isolation',
    description:
      'Services handling sensitive data should be deployed within a VPC with security groups and NACLs for network isolation.',
    severity: 'critical',
    check: (spec) => {
      const hasVpc = spec.groups.some((g) => g.type === 'vpc');
      if (hasVpc) return [];
      const needsVpc = ['ec2', 'rds', 'aurora', 'elasticache', 'redshift', 'ecs', 'eks'];
      return spec.services
        .filter((s) => needsVpc.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'sec-006',
    title: 'Use Secrets Manager for credentials',
    description:
      'Store database credentials, API keys, and other secrets in AWS Secrets Manager with automatic rotation enabled.',
    severity: 'recommended',
    check: (spec) => {
      const hasSecrets = spec.services.some(
        (s) => s.type === 'secrets-manager' || s.type === 'kms'
      );
      if (hasSecrets) return [];
      const needsSecrets = ['rds', 'aurora', 'documentdb', 'redshift'];
      return spec.services
        .filter((s) => needsSecrets.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'sec-007',
    title: 'Enable GuardDuty for threat detection',
    description:
      'Amazon GuardDuty provides intelligent threat detection to protect your AWS accounts and workloads from malicious activity.',
    severity: 'recommended',
    check: (spec) => {
      const hasGuardDuty = spec.services.some((s) => s.type === 'guardduty');
      if (hasGuardDuty) return [];
      // Recommend for any non-trivial architecture
      if (spec.services.length >= 3) {
        return spec.services.slice(0, 2).map((s) => s.id);
      }
      return [];
    },
  },
  {
    id: 'sec-008',
    title: 'Enable CloudTrail for audit logging',
    description:
      'AWS CloudTrail records API calls for your account, providing audit logs essential for security analysis and compliance.',
    severity: 'recommended',
    check: (spec) => {
      const hasCloudTrail = spec.services.some((s) => s.type === 'cloudtrail');
      if (hasCloudTrail) return [];
      if (spec.services.length >= 2) {
        return spec.services.slice(0, 2).map((s) => s.id);
      }
      return [];
    },
  },
  {
    id: 'sec-009',
    title: 'Use private subnets for backend services',
    description:
      'Backend services (databases, application servers) should be placed in private subnets with no direct internet access.',
    severity: 'recommended',
    check: (spec) => {
      const hasPrivateSubnet = spec.groups.some(
        (g) => g.type === 'subnet' && g.label.toLowerCase().includes('private')
      );
      if (hasPrivateSubnet) return [];
      const backendServices = ['rds', 'aurora', 'elasticache', 'redshift', 'ecs', 'eks'];
      return spec.services
        .filter((s) => backendServices.includes(s.type))
        .map((s) => s.id);
    },
  },
  {
    id: 'sec-010',
    title: 'Enable DDoS protection with AWS Shield',
    description:
      'AWS Shield provides DDoS protection for your applications. Consider Shield Advanced for critical workloads with enhanced protection.',
    severity: 'optional',
    check: (spec) => {
      const hasShield = spec.services.some((s) => s.type === 'shield');
      if (hasShield) return [];
      const publicFacing = ['alb', 'cloudfront', 'api-gateway', 'elb', 'nlb'];
      return spec.services
        .filter((s) => publicFacing.includes(s.type))
        .map((s) => s.id);
    },
  },
];

/**
 * Generates security recommendations for the architecture.
 * Returns up to 10 recommendations sorted by severity.
 *
 * @param spec - The architecture specification to analyze
 * @returns Array of security recommendations (max 10)
 */
export function analyzeSecurityRules(
  spec: ArchitectureSpec
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const rule of SECURITY_RULES) {
    const affectedServices = rule.check(spec);
    if (affectedServices.length > 0) {
      recommendations.push({
        id: rule.id,
        category: 'security',
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

  // Return at most 10 recommendations (Requirement 6.3)
  return recommendations.slice(0, 10);
}
