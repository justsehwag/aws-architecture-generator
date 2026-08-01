/**
 * Architecture analysis module.
 *
 * Provides complete architecture analysis including Well-Architected Framework
 * evaluation, missing component detection, and categorized recommendations.
 */

export { analyzeArchitecture, detectMissingComponents } from './analyzer';
export { evaluateWellArchitected } from './well-architected';
export {
  getSecurityRecommendations,
  getHighAvailabilityRecommendations,
  getCostOptimizationRecommendations,
} from './recommendations';
