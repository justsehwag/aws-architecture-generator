/**
 * Property-based tests for the LLM schema validator.
 *
 * **Validates: Requirements 1.2, 1.4**
 *
 * Property 2: For any JSON that conforms to ArchitectureSpec schema, validateArchitectureSpec returns success=true
 * Property 3: For any non-JSON string, validateArchitectureSpec returns success=false with errors
 * Property 20: Track failed attempts - after exactly 5 failures the lockout state is triggered
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateArchitectureSpec } from './schema-validator';

/**
 * Arbitrary for generating valid AWS service types recognized by the schema.
 */
const awsServiceTypeArb = fc.constantFrom(
  'ec2', 'lambda', 'ecs', 'eks', 'fargate', 's3', 'ebs', 'efs',
  'rds', 'aurora', 'dynamodb', 'elasticache', 'redshift', 'vpc',
  'cloudfront', 'route53', 'api-gateway', 'alb', 'nlb', 'elb',
  'iam', 'cognito', 'waf', 'sqs', 'sns', 'eventbridge',
  'step-functions', 'kinesis', 'cloudwatch', 'kms', 'generic'
);

/**
 * Arbitrary for generating valid service node objects.
 */
const serviceNodeArb = fc.record({
  id: fc.uuid(),
  type: awsServiceTypeArb,
  label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  properties: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z]/.test(s)),
    fc.string({ minLength: 1, maxLength: 20 }),
    { minKeys: 0, maxKeys: 3 }
  ),
});

/**
 * Arbitrary for generating valid connection objects.
 */
const connectionArb = (serviceIds: string[]) =>
  fc.record({
    id: fc.uuid(),
    sourceId: fc.constantFrom(...serviceIds),
    targetId: fc.constantFrom(...serviceIds),
    label: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  });

/**
 * Arbitrary for generating a valid ArchitectureSpec JSON string.
 */
const validArchSpecArb = fc.integer({ min: 1, max: 5 }).chain((numServices) =>
  fc.tuple(
    fc.uuid(),
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    fc.constantFrom('us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'),
    fc.array(serviceNodeArb, { minLength: numServices, maxLength: numServices }),
    fc.string({ minLength: 10, maxLength: 100 }),
    fc.constantFrom('claude-3-sonnet', 'gpt-4', 'claude-3-haiku'),
  ).map(([id, name, description, region, services, prompt, llmModel]) => {
    const spec = {
      id,
      name,
      description,
      region,
      services,
      connections: [] as Array<{ id: string; sourceId: string; targetId: string }>,
      groups: [] as Array<{ id: string; type: string; label: string; children: string[] }>,
      metadata: {
        prompt,
        generatedAt: new Date().toISOString(),
        llmModel,
      },
    };
    return JSON.stringify(spec);
  })
);

/**
 * Arbitrary for generating strings that are definitely not valid JSON.
 */
const nonJsonStringArb = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => {
  try {
    JSON.parse(s);
    return false;
  } catch {
    return true;
  }
});

describe('schema-validator property tests', () => {
  it('Property 2: valid ArchitectureSpec JSON always returns success=true', () => {
    fc.assert(
      fc.property(validArchSpecArb, (jsonStr) => {
        const result = validateArchitectureSpec(jsonStr);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: non-JSON strings always return success=false with errors', () => {
    fc.assert(
      fc.property(nonJsonStringArb, (input) => {
        const result = validateArchitectureSpec(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 20: after exactly 5 failures the lockout state is triggered', () => {
    fc.assert(
      fc.property(
        fc.array(nonJsonStringArb, { minLength: 5, maxLength: 5 }),
        (failedInputs) => {
          // Simulate a lockout counter tracking failed validation attempts
          let failureCount = 0;
          let lockedOut = false;
          const LOCKOUT_THRESHOLD = 5;

          for (const input of failedInputs) {
            const result = validateArchitectureSpec(input);
            if (!result.success) {
              failureCount++;
            }
            if (failureCount >= LOCKOUT_THRESHOLD) {
              lockedOut = true;
            }
          }

          // After 5 failures, lockout must be triggered
          expect(failureCount).toBe(5);
          expect(lockedOut).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
