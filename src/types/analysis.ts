import type { AWSServiceType } from './architecture';

/**
 * Well-Architected Framework pillar identifiers.
 */
export type WellArchitectedPillar =
  | 'operational-excellence'
  | 'security'
  | 'reliability'
  | 'performance-efficiency'
  | 'cost-optimization'
  | 'sustainability';

/**
 * Assessment of a single Well-Architected Framework pillar.
 */
export interface PillarAssessment {
  pillar: WellArchitectedPillar;
  status: 'no-gaps' | 'gaps-found';
  summary: string;
}

/**
 * Overall Well-Architected Framework assessment containing all 6 pillars.
 */
export interface WellArchitectedAssessment {
  pillars: PillarAssessment[];
}

/**
 * Recommendation category for architecture improvements.
 */
export type RecommendationCategory =
  | 'security'
  | 'high-availability'
  | 'cost-optimization';

/**
 * Severity level for recommendations and missing components.
 */
export type Severity = 'critical' | 'recommended' | 'optional';

/**
 * A specific recommendation for improving the architecture.
 */
export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  severity: Severity;
  title: string;
  description: string;
  affectedServices: string[]; // ServiceNode IDs
}

/**
 * A component detected as missing from the architecture based on best practices.
 */
export interface MissingComponent {
  type: string;
  severity: Severity;
  reason: string;
  suggestedService: AWSServiceType;
}

/**
 * Complete architecture analysis result including Well-Architected assessment,
 * recommendations, and missing component detection.
 */
export interface ArchitectureAnalysis {
  wellArchitected: WellArchitectedAssessment;
  recommendations: Recommendation[];
  missingComponents: MissingComponent[];
}
