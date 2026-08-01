import type { AWSServiceType } from './architecture';

/**
 * Default usage assumptions for cost estimation calculations.
 */
export interface UsageAssumptions {
  computeHoursPerMonth: number; // default: 730
  requestsPerMonth: number; // default: 1_000_000
  dataTransferGB: number; // default: 100
  storageGB: number; // default: 50
}

/**
 * Cost estimate for an individual AWS service in the architecture.
 */
export interface ServiceCost {
  serviceId: string;
  serviceName: string;
  serviceType: AWSServiceType;
  monthlyCost: number; // USD, 2 decimal places
  available: boolean; // false if pricing unavailable
}

/**
 * Complete cost estimate for an architecture including per-service breakdown
 * and the usage assumptions used for calculation.
 */
export interface CostEstimate {
  totalMonthlyCost: number; // USD, 2 decimal places
  services: ServiceCost[];
  assumptions: UsageAssumptions;
}
