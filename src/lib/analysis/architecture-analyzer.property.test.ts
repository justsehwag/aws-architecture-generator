/**
 * Property-based tests for architecture analysis.
 *
 * **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6**
 *
 * Property 14: For any ArchitectureSpec, the analysis produces exactly 6 pillar assessments.
 * Property 15: For any category, recommendations are at most 10, each with valid severity,
 *              sorted Critical → Optional.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { analyzeArchitecture } from './architecture-analyzer';
import type { ArchitectureSpec, ServiceNode, AWSServiceType } from '@/types/architecture';
import type { Severity } from '@/types/analysis';

// AWS service types suitable for generating random architectures
const SERVICE_TYPES: AWSServiceType[] = [
  'ec2', 'lambda', 's3', 'dynamodb', 'rds', 'sqs', 'sns', 'cloudfront',
  'api-gateway', 'cognito', 'ecs', 'eks', 'fargate', 'alb', 'vpc',
  'route53', 'cloudwatch', 'waf', 'kms', 'elasticache', 'aurora',
];

// Arbitrary for generating random ServiceNodes
const serviceNodeArb: fc.Arbitrary<ServiceNode> = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom(...SERVICE_TYPES),
  label: fc.string({ minLength: 1, maxLength: 30 }),
  properties: fc.constant({}),
});

// Arbitrary for a valid ArchitectureSpec with random services
const archSpecArb: fc.Arbitrary<ArchitectureSpec> = fc
  .array(serviceNodeArb, { minLength: 0, maxLength: 15 })
  .map((services) => ({
    id: 'analysis-test-id',
    name: 'Analysis Test Architecture',
    description: 'Generated for analysis property tests',
    region: 'us-east-1',
    services,
    connections: [],
    groups: [],
    metadata: {
      prompt: 'test prompt for analysis property test',
      generatedAt: new Date().toISOString(),
      llmModel: 'test-model',
    },
  }));

// Severity ordering for sorting validation
const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  recommended: 1,
  optional: 2,
};

describe('Architecture analyzer property tests', () => {
  it('Property 14: analysis always produces exactly 6 pillar assessments', () => {
    fc.assert(
      fc.property(archSpecArb, (spec) => {
        const analysis = analyzeArchitecture(spec);
        expect(analysis.wellArchitected.pillars).toHaveLength(6);

        // Each pillar should have a valid pillar name and status
        const expectedPillars = [
          'operational-excellence',
          'security',
          'reliability',
          'performance-efficiency',
          'cost-optimization',
          'sustainability',
        ];
        const actualPillars = analysis.wellArchitected.pillars.map((p) => p.pillar);
        expect(actualPillars).toEqual(expectedPillars);

        for (const pillar of analysis.wellArchitected.pillars) {
          expect(['no-gaps', 'gaps-found']).toContain(pillar.status);
          expect(pillar.summary.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 15: recommendations per category are at most 10 with valid severity', () => {
    fc.assert(
      fc.property(archSpecArb, (spec) => {
        const analysis = analyzeArchitecture(spec);
        const validSeverities: Severity[] = ['critical', 'recommended', 'optional'];

        // Group recommendations by category
        const byCategory = new Map<string, typeof analysis.recommendations>();
        for (const rec of analysis.recommendations) {
          const existing = byCategory.get(rec.category) ?? [];
          existing.push(rec);
          byCategory.set(rec.category, existing);
        }

        // Each category should have at most 10 recommendations
        for (const [, recs] of byCategory) {
          expect(recs.length).toBeLessThanOrEqual(10);

          // Each recommendation should have a valid severity
          for (const rec of recs) {
            expect(validSeverities).toContain(rec.severity);
            expect(rec.title.length).toBeGreaterThan(0);
            expect(rec.description.length).toBeGreaterThan(0);
          }

          // Recommendations should be sorted Critical → Recommended → Optional
          for (let i = 1; i < recs.length; i++) {
            const prevOrder = SEVERITY_ORDER[recs[i - 1].severity];
            const currOrder = SEVERITY_ORDER[recs[i].severity];
            expect(prevOrder).toBeLessThanOrEqual(currOrder);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
