/**
 * Core cost estimation logic for AWS architecture diagrams.
 *
 * Calculates estimated monthly costs based on the services in an
 * architecture specification and configurable usage assumptions.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5, 7.6
 */

import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';
import type { CostEstimate, ServiceCost, UsageAssumptions } from '@/types/cost';
import { getServicePricing } from './pricing-data';
import { getServiceEntry } from '@/lib/aws-service-registry';

/**
 * Default usage assumptions for cost calculations.
 * Based on typical production workload patterns.
 */
export const DEFAULT_ASSUMPTIONS: UsageAssumptions = {
  computeHoursPerMonth: 730,
  requestsPerMonth: 1_000_000,
  dataTransferGB: 100,
  storageGB: 50,
};

/**
 * Reference values used to determine scaling ratios.
 * These match the assumptions used to derive base costs in pricing-data.
 */
const REFERENCE_ASSUMPTIONS: UsageAssumptions = {
  computeHoursPerMonth: 730,
  requestsPerMonth: 1_000_000,
  dataTransferGB: 100,
  storageGB: 50,
};

/**
 * Round a number to 2 decimal places for USD cost display.
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate the monthly cost for a single service based on usage assumptions.
 *
 * The cost is calculated as:
 * baseCost + scaling adjustments based on deviation from reference assumptions.
 *
 * If pricing data is unavailable for the service, returns a ServiceCost
 * with `available: false` and $0.00 cost.
 */
function calculateServiceCost(
  service: ServiceNode,
  assumptions: UsageAssumptions
): ServiceCost {
  const pricing = getServicePricing(service.type);
  const registryEntry = getServiceEntry(service.type);
  const displayName = registryEntry?.displayName ?? service.label;

  // If no pricing data or pricing marked as unavailable
  if (!pricing || !pricing.available) {
    return {
      serviceId: service.id,
      serviceName: displayName,
      serviceType: service.type,
      monthlyCost: 0,
      available: false,
    };
  }

  // Start with the base monthly cost (calculated at reference assumptions)
  let cost = pricing.baseMonthlyCost;

  // Adjust for compute hours deviation
  const computeHoursDelta =
    assumptions.computeHoursPerMonth - REFERENCE_ASSUMPTIONS.computeHoursPerMonth;
  if (computeHoursDelta !== 0 && pricing.scaling.perComputeHour > 0) {
    cost += computeHoursDelta * pricing.scaling.perComputeHour;
  }

  // Adjust for requests deviation (in millions)
  const requestsDeltaMillions =
    (assumptions.requestsPerMonth - REFERENCE_ASSUMPTIONS.requestsPerMonth) /
    1_000_000;
  if (requestsDeltaMillions !== 0 && pricing.scaling.perMillionRequests > 0) {
    cost += requestsDeltaMillions * pricing.scaling.perMillionRequests;
  }

  // Adjust for data transfer deviation
  const transferDelta =
    assumptions.dataTransferGB - REFERENCE_ASSUMPTIONS.dataTransferGB;
  if (transferDelta !== 0 && pricing.scaling.perGBTransfer > 0) {
    cost += transferDelta * pricing.scaling.perGBTransfer;
  }

  // Adjust for storage deviation
  const storageDelta = assumptions.storageGB - REFERENCE_ASSUMPTIONS.storageGB;
  if (storageDelta !== 0 && pricing.scaling.perGBStorage > 0) {
    cost += storageDelta * pricing.scaling.perGBStorage;
  }

  // Ensure cost doesn't go below zero
  cost = Math.max(0, cost);

  return {
    serviceId: service.id,
    serviceName: displayName,
    serviceType: service.type,
    monthlyCost: roundToTwoDecimals(cost),
    available: true,
  };
}

/**
 * Estimate monthly costs for an entire architecture specification.
 *
 * Calculates per-service costs and a total that only includes services
 * where pricing data is available. Returns $0.00 total for architectures
 * with no AWS services.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5, 7.6
 */
export function estimateCost(
  spec: ArchitectureSpec,
  assumptions: UsageAssumptions = DEFAULT_ASSUMPTIONS
): CostEstimate {
  // Requirement 7.6: Return $0.00 with no breakdown for empty architectures
  if (!spec.services || spec.services.length === 0) {
    return {
      totalMonthlyCost: 0,
      services: [],
      assumptions,
    };
  }

  // Calculate cost for each service
  const serviceCosts: ServiceCost[] = spec.services.map((service) =>
    calculateServiceCost(service, assumptions)
  );

  // Requirement 7.5: Sum only services where pricing is available
  const totalMonthlyCost = serviceCosts
    .filter((sc) => sc.available)
    .reduce((sum, sc) => sum + sc.monthlyCost, 0);

  return {
    totalMonthlyCost: roundToTwoDecimals(totalMonthlyCost),
    services: serviceCosts,
    assumptions,
  };
}
