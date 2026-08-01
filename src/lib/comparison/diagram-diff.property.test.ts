/**
 * Property-based tests for diagram diffing.
 *
 * **Validates: Requirements 17.1, 17.7**
 *
 * Property 32: For any spec diffed against itself, result has 0 added, 0 removed, 0 modified
 * Property 33: Added count + removed count + unchanged = total services across both specs
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { diffDiagrams } from './diagram-diff';
import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';

/**
 * Service types used for generating test specs.
 */
const serviceTypes = [
  'ec2', 'lambda', 's3', 'rds', 'dynamodb', 'vpc', 'sqs', 'sns',
  'cloudfront', 'api-gateway', 'alb', 'ecs', 'fargate',
] as const;

/**
 * Build a valid ArchitectureSpec with the given services.
 */
function buildSpec(services: ServiceNode[]): ArchitectureSpec {
  return {
    id: 'test-spec',
    name: 'Test Architecture',
    description: 'A test architecture for diffing',
    region: 'us-east-1',
    services,
    connections: [],
    groups: [],
    metadata: {
      prompt: 'Test prompt',
      generatedAt: new Date().toISOString(),
      llmModel: 'test-model',
    },
  };
}

/**
 * Arbitrary for generating a list of service nodes with unique IDs.
 */
const servicesArb = (minLen: number, maxLen: number) =>
  fc.integer({ min: minLen, max: maxLen }).map((n) =>
    Array.from({ length: n }, (_, i) => ({
      id: `svc-${i}`,
      type: serviceTypes[i % serviceTypes.length] as ServiceNode['type'],
      label: `Service${i}`,
      properties: {} as Record<string, string>,
    }))
  );

describe('diagram-diff property tests', () => {
  it('Property 32: spec diffed against itself has 0 added, 0 removed, 0 modified', () => {
    fc.assert(
      fc.property(
        servicesArb(1, 30),
        (services) => {
          const spec = buildSpec(services);
          const result = diffDiagrams(spec, spec);

          expect(result.added).toHaveLength(0);
          expect(result.removed).toHaveLength(0);
          expect(result.modified).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 33: added + removed + unchanged = total unique services across both specs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 10 }),
        (sizeA, sizeB, sharedCount) => {
          const actualShared = Math.min(sharedCount, sizeA, sizeB);

          // Create specA services
          const servicesA: ServiceNode[] = Array.from({ length: sizeA }, (_, i) => ({
            id: i < actualShared ? `shared-${i}` : `a-only-${i}`,
            type: serviceTypes[i % serviceTypes.length] as ServiceNode['type'],
            label: `ServiceA${i}`,
            properties: {},
          }));

          // Create specB services: first `actualShared` have same IDs and properties as A
          const servicesB: ServiceNode[] = Array.from({ length: sizeB }, (_, i) => ({
            id: i < actualShared ? `shared-${i}` : `b-only-${i}`,
            type: serviceTypes[i % serviceTypes.length] as ServiceNode['type'],
            label: i < actualShared ? `ServiceA${i}` : `ServiceB${i}`,
            properties: {},
          }));

          const specA = buildSpec(servicesA);
          const specB = buildSpec(servicesB);
          const result = diffDiagrams(specA, specB);

          // unchanged = shared IDs that are NOT modified
          const unchangedCount = actualShared - result.modified.length;

          // added count + removed count + modified count + unchanged count
          // should account for all unique IDs
          const totalUniqueIds = new Set([
            ...servicesA.map(s => s.id),
            ...servicesB.map(s => s.id),
          ]).size;

          expect(
            result.added.length + result.removed.length + result.modified.length + unchangedCount
          ).toBe(totalUniqueIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});
