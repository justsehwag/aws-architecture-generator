/**
 * Property-based tests for the IaC Generator.
 *
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6**
 *
 * Property 28: For any spec with N services (N≤50), generateIaC produces code with resourceCount=N
 * Property 29: Generated code contains parameterized variables
 * Property 30: Unsupported services produce warnings
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateIaC, type IaCFormat } from './iac-generator';
import type { ArchitectureSpec, ServiceNode } from '@/types/architecture';

/**
 * Service types that have Terraform resource mappings (supported).
 */
const supportedServiceTypes = [
  'ec2', 'lambda', 's3', 'rds', 'aurora', 'dynamodb', 'vpc', 'sqs',
  'sns', 'cloudfront', 'route53', 'api-gateway', 'alb', 'nlb', 'elb',
  'ecs', 'eks', 'fargate', 'elasticache', 'redshift', 'cognito',
  'step-functions', 'eventbridge', 'kinesis', 'cloudwatch', 'kms',
  'secrets-manager', 'waf', 'nat-gateway', 'efs', 'sagemaker', 'glue', 'iam',
] as const;

/**
 * Service types that do NOT have Terraform resource mappings (unsupported).
 */
const unsupportedServiceTypes = [
  'bedrock', 'rekognition', 'comprehend', 'lex', 'polly', 'textract',
  'translate', 'opensearch', 'msk', 'data-pipeline', 'neptune',
  'documentdb', 'memorydb', 'shield', 'guardduty', 'inspector', 'macie',
  'appsync', 'mq', 'athena', 'emr', 'quicksight',
] as const;

/**
 * Arbitrary for generating a service node with a supported type.
 */
const supportedServiceNodeArb = (index: number): fc.Arbitrary<ServiceNode> =>
  fc.record({
    id: fc.constant(`svc-${index}`),
    type: fc.constantFrom(...supportedServiceTypes) as fc.Arbitrary<ServiceNode['type']>,
    label: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z]/.test(s)).map(s => `${s}${index}`),
    properties: fc.constant({} as Record<string, string>),
  });

/**
 * Arbitrary for generating a service node with an unsupported type.
 */
const unsupportedServiceNodeArb = (index: number): fc.Arbitrary<ServiceNode> =>
  fc.record({
    id: fc.constant(`unsup-${index}`),
    type: fc.constantFrom(...unsupportedServiceTypes) as fc.Arbitrary<ServiceNode['type']>,
    label: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]/.test(s)).map(s => `Unsupported${index}`),
    properties: fc.constant({} as Record<string, string>),
  });

/**
 * Build a minimal valid ArchitectureSpec with the given services.
 */
function buildSpec(services: ServiceNode[]): ArchitectureSpec {
  return {
    id: 'test-spec',
    name: 'Test Architecture',
    description: 'Test architecture for property testing',
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

describe('iac-generator property tests', () => {
  it('Property 28: for any spec with N services (N≤50), generateIaC produces code with resourceCount=N', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (n) => {
          const services: ServiceNode[] = Array.from({ length: n }, (_, i) => ({
            id: `svc-${i}`,
            type: supportedServiceTypes[i % supportedServiceTypes.length] as ServiceNode['type'],
            label: `Service${i}`,
            properties: {},
          }));

          const spec = buildSpec(services);
          const result = generateIaC(spec, 'terraform');

          expect(result.resourceCount).toBe(n);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 29: generated code contains parameterized variables', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (n) => {
          // Use service types that have parameterizable properties
          const parameterizableTypes = ['ec2', 'lambda', 'rds', 'dynamodb', 'vpc', 'elasticache'] as const;
          const services: ServiceNode[] = Array.from({ length: n }, (_, i) => ({
            id: `svc-${i}`,
            type: parameterizableTypes[i % parameterizableTypes.length] as ServiceNode['type'],
            label: `ParamService${i}`,
            properties: {},
          }));

          const spec = buildSpec(services);
          const result = generateIaC(spec, 'terraform');

          // Generated Terraform code should contain 'variable' blocks and 'var.' references
          expect(result.code).toContain('variable');
          expect(result.code).toContain('var.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 30: unsupported services produce warnings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (n) => {
          const services: ServiceNode[] = Array.from({ length: n }, (_, i) => ({
            id: `unsup-${i}`,
            type: unsupportedServiceTypes[i % unsupportedServiceTypes.length] as ServiceNode['type'],
            label: `UnsupportedService${i}`,
            properties: {},
          }));

          const spec = buildSpec(services);
          const result = generateIaC(spec, 'terraform');

          // Each unsupported service should produce a warning
          expect(result.warnings.length).toBe(n);
          // Every warning mentions manual configuration
          for (const warning of result.warnings) {
            expect(warning).toContain('manual configuration');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
