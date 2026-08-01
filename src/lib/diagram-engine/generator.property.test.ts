/**
 * Property-based tests for the Diagram Engine generator.
 *
 * **Validates: Requirements 2.1, 2.2, 2.5**
 *
 * Property 4: For any valid ArchitectureSpec, generateDiagram produces XML
 *             containing <mxfile> and <mxGraphModel>.
 * Property 5: For any service with type in the registry, the output contains
 *             its icon style; for unknown types, output contains generic node style.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateDiagram } from './generator';
import { isKnownService, getServiceIcon, GENERIC_NODE_STYLE } from '@/lib/aws-service-registry';
import type { ArchitectureSpec, ServiceNode, AWSServiceType } from '@/types/architecture';

// Known service types for generating valid service nodes
const KNOWN_SERVICE_TYPES: AWSServiceType[] = [
  'ec2', 'lambda', 's3', 'dynamodb', 'rds', 'sqs', 'sns', 'cloudfront',
  'api-gateway', 'cognito', 'ecs', 'eks', 'fargate', 'alb',
];

// Arbitrary for a valid ServiceNode with a known type
const knownServiceNodeArb = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom(...KNOWN_SERVICE_TYPES),
  label: fc.string({ minLength: 1, maxLength: 30 }),
  properties: fc.constant({}),
}) as fc.Arbitrary<ServiceNode>;

// Arbitrary for a ServiceNode with an unknown type
const unknownServiceNodeArb = fc.record({
  id: fc.uuid(),
  type: fc.constant('unknown-service-xyz' as AWSServiceType),
  label: fc.string({ minLength: 1, maxLength: 30 }),
  properties: fc.constant({}),
}) as fc.Arbitrary<ServiceNode>;

// Arbitrary for a valid ArchitectureSpec with 1-5 known services
const validArchSpecArb: fc.Arbitrary<ArchitectureSpec> = fc
  .array(knownServiceNodeArb, { minLength: 1, maxLength: 5 })
  .map((services) => ({
    id: 'test-id',
    name: 'Test Architecture',
    description: 'Generated for property test',
    region: 'us-east-1',
    services,
    connections: [],
    groups: [],
    metadata: {
      prompt: 'test prompt for property test',
      generatedAt: new Date().toISOString(),
      llmModel: 'test-model',
    },
  }));

describe('Diagram Engine generator property tests', () => {
  it('Property 4: generateDiagram produces XML containing <mxfile> and <mxGraphModel>', () => {
    fc.assert(
      fc.property(validArchSpecArb, (spec) => {
        const result = generateDiagram(spec);
        expect(result.xml).toContain('<mxfile>');
        expect(result.xml).toContain('<mxGraphModel>');
        expect(result.xml).toContain('</mxfile>');
        expect(result.xml).toContain('</mxGraphModel>');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 5: known service types produce their icon style in output', () => {
    fc.assert(
      fc.property(
        fc.array(knownServiceNodeArb, { minLength: 1, maxLength: 3 }),
        (services) => {
          const spec: ArchitectureSpec = {
            id: 'test-id',
            name: 'Test Architecture',
            description: 'test',
            region: 'us-east-1',
            services,
            connections: [],
            groups: [],
            metadata: {
              prompt: 'test prompt for property test',
              generatedAt: new Date().toISOString(),
              llmModel: 'test-model',
            },
          };

          const result = generateDiagram(spec);

          for (const service of services) {
            expect(isKnownService(service.type)).toBe(true);
            const iconStyle = getServiceIcon(service.type);
            // The icon style prefix should appear in the XML output
            expect(result.xml).toContain(iconStyle);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 (inverse): unknown service types produce generic node style in output', () => {
    fc.assert(
      fc.property(
        fc.array(unknownServiceNodeArb, { minLength: 1, maxLength: 3 }),
        (services) => {
          const spec: ArchitectureSpec = {
            id: 'test-id',
            name: 'Test Architecture',
            description: 'test',
            region: 'us-east-1',
            services,
            connections: [],
            groups: [],
            metadata: {
              prompt: 'test prompt for property test',
              generatedAt: new Date().toISOString(),
              llmModel: 'test-model',
            },
          };

          const result = generateDiagram(spec);

          // Should contain the generic node style
          expect(result.xml).toContain(GENERIC_NODE_STYLE);
          // Should produce warnings for each unknown service
          expect(result.warnings.length).toBe(services.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
