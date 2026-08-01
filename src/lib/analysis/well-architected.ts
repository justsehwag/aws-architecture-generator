/**
 * Well-Architected Framework pillar evaluation logic.
 *
 * Evaluates an architecture specification against the 6 AWS Well-Architected
 * Framework pillars based on presence/absence of key services.
 *
 * Validates: Requirements 6.2
 */

import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';
import type {
  WellArchitectedAssessment,
  PillarAssessment,
  WellArchitectedPillar,
} from '@/types/analysis';

/**
 * Services that indicate good practice for each pillar.
 */
const PILLAR_INDICATORS: Record<WellArchitectedPillar, string[]> = {
  'operational-excellence': [
    'cloudwatch',
    'cloudtrail',
    'config',
    'systems-manager',
    'cloudformation',
  ],
  security: [
    'iam',
    'cognito',
    'waf',
    'shield',
    'kms',
    'secrets-manager',
    'certificate-manager',
    'guardduty',
    'inspector',
    'macie',
  ],
  reliability: [
    'elb',
    'alb',
    'nlb',
    'route53',
    'backup',
    'efs',
    's3',
  ],
  'performance-efficiency': [
    'cloudfront',
    'elasticache',
    'global-accelerator',
    'lambda',
    'fargate',
    'auto-scaling',
  ],
  'cost-optimization': [
    'lambda',
    'fargate',
    's3',
    'dynamodb',
    'cloudfront',
  ],
  sustainability: [
    'lambda',
    'fargate',
    's3',
    'graviton',
    'cloudfront',
  ],
};

/**
 * Human-readable pillar display names.
 */
const PILLAR_NAMES: Record<WellArchitectedPillar, string> = {
  'operational-excellence': 'Operational Excellence',
  security: 'Security',
  reliability: 'Reliability',
  'performance-efficiency': 'Performance Efficiency',
  'cost-optimization': 'Cost Optimization',
  sustainability: 'Sustainability',
};

/**
 * Evaluates an architecture against the 6 AWS Well-Architected Framework pillars.
 *
 * Each pillar is assessed based on whether the architecture includes services
 * that indicate adherence to that pillar's best practices.
 *
 * @param spec - The architecture specification to evaluate
 * @returns Assessment with exactly 6 pillar evaluations
 */
export function evaluateWellArchitected(
  spec: ArchitectureSpec
): WellArchitectedAssessment {
  const serviceTypes = new Set(spec.services.map((s: ServiceNode) => s.type));

  const pillars: PillarAssessment[] = (
    Object.keys(PILLAR_INDICATORS) as WellArchitectedPillar[]
  ).map((pillar) => evaluatePillar(pillar, serviceTypes, spec));

  return { pillars };
}

/**
 * Evaluates a single Well-Architected pillar.
 */
function evaluatePillar(
  pillar: WellArchitectedPillar,
  serviceTypes: Set<string>,
  spec: ArchitectureSpec
): PillarAssessment {
  const indicators = PILLAR_INDICATORS[pillar];
  const presentIndicators = indicators.filter((type) => serviceTypes.has(type));
  const coverageRatio = indicators.length > 0
    ? presentIndicators.length / indicators.length
    : 0;

  // Consider gaps found if less than 20% of pillar indicators are present
  const hasGaps = coverageRatio < 0.2;

  const summary = hasGaps
    ? buildGapSummary(pillar, indicators, presentIndicators, spec)
    : buildNoGapSummary(pillar, presentIndicators);

  return {
    pillar,
    status: hasGaps ? 'gaps-found' : 'no-gaps',
    summary,
  };
}

/**
 * Builds a summary message when gaps are detected for a pillar.
 */
function buildGapSummary(
  pillar: WellArchitectedPillar,
  indicators: string[],
  presentIndicators: string[],
  _spec: ArchitectureSpec
): string {
  const pillarName = PILLAR_NAMES[pillar];
  const missingCount = indicators.length - presentIndicators.length;

  if (presentIndicators.length === 0) {
    return `${pillarName}: No supporting services detected. Consider adding services for this pillar.`;
  }

  return `${pillarName}: ${missingCount} recommended service categories are missing. Currently using ${presentIndicators.join(', ')}.`;
}

/**
 * Builds a summary message when no gaps are detected for a pillar.
 */
function buildNoGapSummary(
  pillar: WellArchitectedPillar,
  presentIndicators: string[]
): string {
  const pillarName = PILLAR_NAMES[pillar];
  return `${pillarName}: Architecture includes ${presentIndicators.join(', ')} supporting this pillar.`;
}
