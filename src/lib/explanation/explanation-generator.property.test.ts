/**
 * Property-based tests for the architecture explanation generator.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 *
 * Property 18: For any spec with N services, serviceDescriptions has exactly N entries
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateExplanation } from './explanation-generator';
import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';

/**
 * Supported service types for generating arbitrary specs.
 */
const serviceTypes = [
  'ec2', 'lambda', 's3', 'rds', 'dynamodb', 'vpc', 'sqs', 'sns',
  'cloudfront', 'api-gateway', 'alb', 'ecs', 'fargate', 'elasticache',
  'kinesis', 'cloudwatch', 'kms', 'cognito', 'step-functions',
] as const;

/**
 * Build a valid ArchitectureSpec with N services for property testing.
 */
function buildSpec(services: ServiceNode[]): ArchitectureSpec {
  return {
    id: 'test-spec',
    name: 'Test Architecture',
    description: 'A test architecture for property testing',
    region: 'us-east-1',
    services,
    connections: [],
    groups: [],
    metadata: {
      prompt: 'Test prompt for property testing',
      generatedAt: new Date().toISOString(),
      llmModel: 'test-model',
    },
  };
}

describe('explanation-generator property tests', () => {
  it('Property 18: for any spec with N services, serviceDescriptions has exactly N entries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        (n) => {
          const services: ServiceNode[] = Array.from({ length: n }, (_, i) => ({
            id: `svc-${i}`,
            type: serviceTypes[i % serviceTypes.length] as ServiceNode['type'],
            label: `Service ${i}`,
            properties: {},
          }));

          const spec = buildSpec(services);
          const explanation = generateExplanation(spec);

          expect(explanation.serviceDescriptions).toHaveLength(n);
        }
      ),
      { numRuns: 100 }
    );
  });
});
