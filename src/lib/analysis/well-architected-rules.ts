/**
 * Well-Architected Framework rules and pillar definitions.
 *
 * Defines the 6 pillars of the AWS Well-Architected Framework and the
 * assessment logic for each pillar based on architecture composition.
 *
 * Pillars:
 * 1. Operational Excellence - Monitoring, IaC, CI/CD
 * 2. Security - Encryption, IAM, WAF, network isolation
 * 3. Reliability - Multi-AZ, auto-scaling, failover
 * 4. Performance Efficiency - Caching, CDN, right compute types
 * 5. Cost Optimization - Serverless, reserved capacity, right-sizing
 * 6. Sustainability - Graviton, serverless, efficient compute
 *
 * Validates: Requirement 6.2
 */

import type { WellArchitectedPillar } from '@/types/analysis';

/**
 * All 6 Well-Architected Framework pillars in canonical order.
 */
export const WELL_ARCHITECTED_PILLARS: WellArchitectedPillar[] = [
  'operational-excellence',
  'security',
  'reliability',
  'performance-efficiency',
  'cost-optimization',
  'sustainability',
];

/**
 * Human-readable pillar names for display.
 */
export const PILLAR_DISPLAY_NAMES: Record<WellArchitectedPillar, string> = {
  'operational-excellence': 'Operational Excellence',
  'security': 'Security',
  'reliability': 'Reliability',
  'performance-efficiency': 'Performance Efficiency',
  'cost-optimization': 'Cost Optimization',
  'sustainability': 'Sustainability',
};

/**
 * Descriptions for each pillar explaining what it covers.
 */
export const PILLAR_DESCRIPTIONS: Record<WellArchitectedPillar, string> = {
  'operational-excellence':
    'The ability to support development and run workloads effectively, gain insight into operations, and continuously improve supporting processes and procedures.',
  'security':
    'The ability to protect data, systems, and assets to take advantage of cloud technologies to improve your security.',
  'reliability':
    'The ability of a workload to perform its intended function correctly and consistently when it is expected to.',
  'performance-efficiency':
    'The ability to use computing resources efficiently to meet system requirements, and to maintain that efficiency as demand changes.',
  'cost-optimization':
    'The ability to run systems to deliver business value at the lowest price point.',
  'sustainability':
    'The ability to continually improve sustainability impacts by reducing energy consumption and increasing efficiency across all components.',
};

/**
 * Key indicators (service types) checked for each pillar assessment.
 */
export const PILLAR_INDICATORS: Record<WellArchitectedPillar, string[]> = {
  'operational-excellence': ['cloudwatch', 'cloudformation', 'codepipeline', 'codebuild', 'codedeploy', 'config', 'systems-manager'],
  'security': ['iam', 'waf', 'shield', 'kms', 'secrets-manager', 'guardduty', 'inspector', 'certificate-manager', 'cognito'],
  'reliability': ['elb', 'alb', 'nlb', 'route53', 'backup', 'global-accelerator'],
  'performance-efficiency': ['cloudfront', 'elasticache', 'memorydb', 'lambda', 'fargate', 'app-runner'],
  'cost-optimization': ['lambda', 'fargate', 'dynamodb', 's3'],
  'sustainability': ['lambda', 'fargate', 'app-runner', 'dynamodb'],
};
