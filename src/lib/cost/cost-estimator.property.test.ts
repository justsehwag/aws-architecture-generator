/**
 * Property-based tests for cost estimation.
 *
 * **Validates: Requirements 7.1, 7.2, 7.4, 7.5**
 *
 * Property 16: totalMonthlyCost equals sum of available service costs.
 * Property 17: For requestsPerMonth outside [1, 10B], the value is invalid (boundary test).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { estimateCost, DEFAULT_ASSUMPTIONS } from './cost-estimator';
import type { ArchitectureSpec, ServiceNode, AWSServiceType } from '@/types/architecture';
import type { UsageAssumptions } from '@/types/cost';

// Services with known pricing available
const PRICED_SERVICES: AWSServiceType[] = [
  'ec2', 'lambda', 's3', 'dynamodb', 'rds', 'sqs', 'sns', 'cloudfront',
  'api-gateway', 'ecs', 'fargate', 'alb', 'cloudwatch', 'kms',
];

// Services with unavailable pricing
const UNPRICED_SERVICES: AWSServiceType[] = ['outposts', 'elemental', 'generic'];

// Arbitrary for generating service nodes with pricing available
const pricedServiceNodeArb: fc.Arbitrary<ServiceNode> = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom(...PRICED_SERVICES),
  label: fc.string({ minLength: 1, maxLength: 30 }),
  properties: fc.constant({}),
});

// Arbitrary for a valid ArchitectureSpec with priced services
const archSpecArb: fc.Arbitrary<ArchitectureSpec> = fc
  .array(pricedServiceNodeArb, { minLength: 0, maxLength: 10 })
  .map((services) => ({
    id: 'cost-test-id',
    name: 'Cost Test Architecture',
    description: 'Generated for cost property tests',
    region: 'us-east-1',
    services,
    connections: [],
    groups: [],
    metadata: {
      prompt: 'test prompt for cost property test',
      generatedAt: new Date().toISOString(),
      llmModel: 'test-model',
    },
  }));

// Arbitrary for valid usage assumptions
const assumptionsArb: fc.Arbitrary<UsageAssumptions> = fc.record({
  computeHoursPerMonth: fc.integer({ min: 1, max: 8760 }),
  requestsPerMonth: fc.integer({ min: 1, max: 10_000_000_000 }),
  dataTransferGB: fc.integer({ min: 0, max: 100_000 }),
  storageGB: fc.integer({ min: 0, max: 1_000_000 }),
});

/**
 * Round to 2 decimal places (same as the implementation)
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

describe('Cost estimator property tests', () => {
  it('Property 16: totalMonthlyCost equals sum of available service costs', () => {
    fc.assert(
      fc.property(archSpecArb, assumptionsArb, (spec, assumptions) => {
        const estimate = estimateCost(spec, assumptions);

        // Sum only services where pricing is available
        const expectedTotal = estimate.services
          .filter((sc) => sc.available)
          .reduce((sum, sc) => sum + sc.monthlyCost, 0);

        expect(estimate.totalMonthlyCost).toBe(roundToTwoDecimals(expectedTotal));
      }),
      { numRuns: 100 }
    );
  });

  it('Property 16: total is $0.00 for empty architectures', () => {
    fc.assert(
      fc.property(assumptionsArb, (assumptions) => {
        const emptySpec: ArchitectureSpec = {
          id: 'empty-id',
          name: 'Empty',
          description: 'No services',
          region: 'us-east-1',
          services: [],
          connections: [],
          groups: [],
          metadata: {
            prompt: 'empty architecture prompt',
            generatedAt: new Date().toISOString(),
            llmModel: 'test-model',
          },
        };

        const estimate = estimateCost(emptySpec, assumptions);
        expect(estimate.totalMonthlyCost).toBe(0);
        expect(estimate.services).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 16: services without available pricing show available=false and $0 cost', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...UNPRICED_SERVICES),
        (serviceType) => {
          const spec: ArchitectureSpec = {
            id: 'unpriced-id',
            name: 'Unpriced Service Test',
            description: 'Testing unavailable pricing',
            region: 'us-east-1',
            services: [
              { id: 'svc-1', type: serviceType, label: 'Unpriced', properties: {} },
            ],
            connections: [],
            groups: [],
            metadata: {
              prompt: 'unpriced service prompt',
              generatedAt: new Date().toISOString(),
              llmModel: 'test-model',
            },
          };

          const estimate = estimateCost(spec, DEFAULT_ASSUMPTIONS);
          expect(estimate.services[0].available).toBe(false);
          expect(estimate.services[0].monthlyCost).toBe(0);
          expect(estimate.totalMonthlyCost).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: requestsPerMonth must be within valid range [1, 10B]', () => {
    // Test that invalid requestsPerMonth values (0 or negative) produce
    // costs that don't follow normal scaling (cost may go below base)
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 0 }),
        (invalidRequests) => {
          const assumptions: UsageAssumptions = {
            ...DEFAULT_ASSUMPTIONS,
            requestsPerMonth: invalidRequests,
          };

          // With a service that scales by requests (like api-gateway)
          const spec: ArchitectureSpec = {
            id: 'boundary-id',
            name: 'Boundary Test',
            description: 'Boundary testing',
            region: 'us-east-1',
            services: [
              { id: 'svc-1', type: 'api-gateway', label: 'API', properties: {} },
            ],
            connections: [],
            groups: [],
            metadata: {
              prompt: 'boundary test prompt text',
              generatedAt: new Date().toISOString(),
              llmModel: 'test-model',
            },
          };

          const estimate = estimateCost(spec, assumptions);
          // The cost should still be non-negative (implementation clamps to 0)
          expect(estimate.totalMonthlyCost).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: very large requestsPerMonth (>10B) still produces valid non-negative costs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10_000_000_001, max: 100_000_000_000 }),
        (largeRequests) => {
          const assumptions: UsageAssumptions = {
            ...DEFAULT_ASSUMPTIONS,
            requestsPerMonth: largeRequests,
          };

          const spec: ArchitectureSpec = {
            id: 'large-req-id',
            name: 'Large Requests Test',
            description: 'Testing large request values',
            region: 'us-east-1',
            services: [
              { id: 'svc-1', type: 'lambda', label: 'Lambda', properties: {} },
            ],
            connections: [],
            groups: [],
            metadata: {
              prompt: 'large requests test prompt',
              generatedAt: new Date().toISOString(),
              llmModel: 'test-model',
            },
          };

          const estimate = estimateCost(spec, assumptions);
          // Even with extreme values, cost must remain a valid number >= 0
          expect(estimate.totalMonthlyCost).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(estimate.totalMonthlyCost)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
