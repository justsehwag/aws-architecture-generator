/**
 * Explanation module - generates plain-language architecture explanations.
 */

export { generateExplanation } from './explanation-generator';
export { generateBestPractices } from './best-practices';
export type { BestPracticeRecommendation } from './best-practices';
export {
  expandAcronyms,
  getExpandedServiceName,
  ACRONYM_DEFINITIONS,
  SERVICE_FULL_NAMES,
} from './acronym-expander';
export { getServiceDescription } from './service-descriptions';
