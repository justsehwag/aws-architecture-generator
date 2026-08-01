/**
 * Core architecture analysis engine.
 *
 * Orchestrates missing component detection, Well-Architected Framework
 * evaluation, and per-category recommendation generation.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type { ArchitectureSpec } from '@/types/architecture';
import type {
  ArchitectureAnalysis,
  WellArchitectedAssessment,
  PillarAssessment,
  WellArchitectedPillar,
  Recommendation,
} from '@/types/analysis';
import {
  analyzeSecurityRules,
  analyzeReliabilityRules,
  analyzeCostRules,
  detectMissingComponents,
} from './rules';

/**
 * All 6 Well-Architected Framework pillars.
 */
const PILLARS: WellArchitectedPillar[] = [
  'operational-excellence',
  'security',
  'reliability',
  'performance-efficiency',
  'cost-optimization',
  'sustainability',
];

/**
 * Evaluates a single Well-Architected pillar against the architecture.
 */
function assessPillar(
  pillar: WellArchitectedPillar,
  spec: ArchitectureSpec,
  securityRecs: Recommendation[],
  reliabilityRecs: Recommendation[],
  costRecs: Recommendation[]
): PillarAssessment {
  switch (pillar) {
    case 'operational-excellence':
      return assessOperationalExcellence(spec);
    case 'security':
      return {
        pillar: 'security',
        status: securityRecs.length > 0 ? 'gaps-found' : 'no-gaps',
        summary:
          securityRecs.length > 0
            ? `Found ${securityRecs.length} security improvement(s). Key areas: ${securityRecs.slice(0, 3).map((r) => r.title).join(', ')}.`
            : 'Architecture follows security best practices with encryption, IAM, and network controls in place.',
      };
    case 'reliability':
      return {
        pillar: 'reliability',
        status: reliabilityRecs.length > 0 ? 'gaps-found' : 'no-gaps',
        summary:
          reliabilityRecs.length > 0
            ? `Found ${reliabilityRecs.length} reliability improvement(s). Key areas: ${reliabilityRecs.slice(0, 3).map((r) => r.title).join(', ')}.`
            : 'Architecture demonstrates strong reliability patterns including multi-AZ deployments and auto-scaling.',
      };
    case 'performance-efficiency':
      return assessPerformanceEfficiency(spec);
    case 'cost-optimization':
      return {
        pillar: 'cost-optimization',
        status: costRecs.length > 0 ? 'gaps-found' : 'no-gaps',
        summary:
          costRecs.length > 0
            ? `Found ${costRecs.length} cost optimization opportunity(ies). Key areas: ${costRecs.slice(0, 3).map((r) => r.title).join(', ')}.`
            : 'Architecture uses cost-effective patterns including serverless components and right-sized resources.',
      };
    case 'sustainability':
      return assessSustainability(spec);
    default:
      return {
        pillar,
        status: 'no-gaps',
        summary: 'No specific gaps identified for this pillar.',
      };
  }
}

/**
 * Assesses Operational Excellence pillar.
 */
function assessOperationalExcellence(spec: ArchitectureSpec): PillarAssessment {
  const gaps: string[] = [];

  // Check for monitoring
  const hasMonitoring = spec.services.some((s) => s.type === 'cloudwatch');
  if (!hasMonitoring && spec.services.length >= 3) {
    gaps.push('no monitoring/observability service');
  }

  // Check for infrastructure as code indicators
  const hasIaC = spec.services.some((s) => s.type === 'cloudformation');
  if (!hasIaC && spec.services.length >= 5) {
    gaps.push('no infrastructure-as-code tooling');
  }

  // Check for CI/CD
  const hasCiCd = spec.services.some((s) =>
    ['codepipeline', 'codebuild', 'codedeploy'].includes(s.type)
  );
  if (!hasCiCd && spec.services.length >= 5) {
    gaps.push('no CI/CD pipeline');
  }

  return {
    pillar: 'operational-excellence',
    status: gaps.length > 0 ? 'gaps-found' : 'no-gaps',
    summary:
      gaps.length > 0
        ? `Gaps identified: ${gaps.join(', ')}. Consider adding monitoring, IaC, and automated deployment pipelines.`
        : 'Architecture includes monitoring, automation, and operational best practices.',
  };
}

/**
 * Assesses Performance Efficiency pillar.
 */
function assessPerformanceEfficiency(spec: ArchitectureSpec): PillarAssessment {
  const gaps: string[] = [];

  // Check for caching
  const hasCaching = spec.services.some((s) =>
    ['elasticache', 'cloudfront', 'memorydb'].includes(s.type)
  );
  if (!hasCaching && spec.services.length >= 5) {
    gaps.push('no caching layer');
  }

  // Check for CDN
  const hasCdn = spec.services.some((s) => s.type === 'cloudfront');
  const hasWebFacing = spec.services.some((s) =>
    ['alb', 'api-gateway', 's3'].includes(s.type)
  );
  if (!hasCdn && hasWebFacing) {
    gaps.push('no CDN for content delivery');
  }

  // Check for appropriate compute selection
  const hasOnlyEc2 = spec.services.some((s) => s.type === 'ec2') &&
    !spec.services.some((s) => ['lambda', 'fargate', 'app-runner'].includes(s.type));
  if (hasOnlyEc2 && spec.services.length >= 5) {
    gaps.push('consider serverless compute for appropriate workloads');
  }

  return {
    pillar: 'performance-efficiency',
    status: gaps.length > 0 ? 'gaps-found' : 'no-gaps',
    summary:
      gaps.length > 0
        ? `Gaps identified: ${gaps.join(', ')}. Review compute, caching, and content delivery choices.`
        : 'Architecture uses appropriate compute types, caching, and content delivery mechanisms.',
  };
}

/**
 * Assesses Sustainability pillar.
 */
function assessSustainability(spec: ArchitectureSpec): PillarAssessment {
  const gaps: string[] = [];

  // Serverless is more sustainable (shared infrastructure)
  const hasServerless = spec.services.some((s) =>
    ['lambda', 'fargate', 'app-runner', 'dynamodb'].includes(s.type)
  );
  const hasTraditional = spec.services.some((s) =>
    ['ec2'].includes(s.type)
  );
  if (hasTraditional && !hasServerless) {
    gaps.push('consider serverless options to reduce idle resource consumption');
  }

  // Graviton is more energy-efficient
  const hasCompute = spec.services.some((s) =>
    ['ec2', 'rds', 'ecs', 'eks'].includes(s.type)
  );
  if (hasCompute) {
    const hasGraviton = spec.services.some(
      (s) =>
        s.properties?.['instanceType']?.includes('g') ||
        s.label.toLowerCase().includes('graviton')
    );
    if (!hasGraviton) {
      gaps.push('consider Graviton-based instances for improved energy efficiency');
    }
  }

  return {
    pillar: 'sustainability',
    status: gaps.length > 0 ? 'gaps-found' : 'no-gaps',
    summary:
      gaps.length > 0
        ? `Gaps identified: ${gaps.join(', ')}. Serverless and Graviton improve energy efficiency.`
        : 'Architecture leverages serverless and energy-efficient compute for reduced environmental impact.',
  };
}

/**
 * Main analysis function. Runs all analysis rules against the architecture
 * specification and produces a complete ArchitectureAnalysis result.
 *
 * @param spec - The architecture specification to analyze
 * @returns Complete architecture analysis including Well-Architected assessment,
 *          recommendations, and missing component detection
 */
export function analyzeArchitecture(
  spec: ArchitectureSpec
): ArchitectureAnalysis {
  // 1. Detect missing components (Requirement 6.1)
  const missingComponents = detectMissingComponents(spec);

  // 2. Generate per-category recommendations (Requirements 6.3, 6.4, 6.5)
  const securityRecs = analyzeSecurityRules(spec);
  const reliabilityRecs = analyzeReliabilityRules(spec);
  const costRecs = analyzeCostRules(spec);

  // Combine all recommendations
  const recommendations: Recommendation[] = [
    ...securityRecs,
    ...reliabilityRecs,
    ...costRecs,
  ];

  // 3. Evaluate Well-Architected Framework pillars (Requirement 6.2)
  const pillars: PillarAssessment[] = PILLARS.map((pillar) =>
    assessPillar(pillar, spec, securityRecs, reliabilityRecs, costRecs)
  );

  const wellArchitected: WellArchitectedAssessment = { pillars };

  return {
    wellArchitected,
    recommendations,
    missingComponents,
  };
}
