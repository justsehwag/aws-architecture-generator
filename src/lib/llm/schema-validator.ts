/**
 * Zod schema for validating LLM JSON responses against the ArchitectureSpec interface.
 *
 * Validates: Requirements 1.2, 1.4
 */

import { z } from 'zod';
import type { ArchitectureSpec } from '@/types/architecture';
import { LLMParseError } from './types';

/**
 * All supported AWS service types as a Zod enum.
 */
const awsServiceTypeSchema = z.enum([
  'ec2',
  'lambda',
  'ecs',
  'eks',
  'fargate',
  'elastic-beanstalk',
  'lightsail',
  'batch',
  'outposts',
  'app-runner',
  'ecr',
  's3',
  'ebs',
  'efs',
  'fsx',
  'storage-gateway',
  'backup',
  'rds',
  'aurora',
  'dynamodb',
  'elasticache',
  'redshift',
  'neptune',
  'documentdb',
  'keyspaces',
  'timestream',
  'memorydb',
  'vpc',
  'cloudfront',
  'route53',
  'api-gateway',
  'elb',
  'alb',
  'nlb',
  'direct-connect',
  'transit-gateway',
  'global-accelerator',
  'nat-gateway',
  'elastic-ip',
  'iam',
  'cognito',
  'waf',
  'shield',
  'kms',
  'secrets-manager',
  'certificate-manager',
  'guardduty',
  'inspector',
  'macie',
  'sqs',
  'sns',
  'eventbridge',
  'step-functions',
  'appsync',
  'mq',
  'kinesis',
  'athena',
  'emr',
  'glue',
  'quicksight',
  'opensearch',
  'msk',
  'data-pipeline',
  'sagemaker',
  'bedrock',
  'rekognition',
  'comprehend',
  'lex',
  'polly',
  'textract',
  'translate',
  'cloudwatch',
  'cloudtrail',
  'config',
  'systems-manager',
  'cloudformation',
  'organizations',
  'trusted-advisor',
  'codecommit',
  'codebuild',
  'codedeploy',
  'codepipeline',
  'dms',
  'datasync',
  'transfer-family',
  'iot-core',
  'iot-greengrass',
  'mediaconvert',
  'elemental',
  'generic',
]);

/**
 * Schema for a service node in the architecture.
 */
const serviceNodeSchema = z.object({
  id: z.string().min(1),
  type: awsServiceTypeSchema,
  label: z.string().min(1),
  properties: z.record(z.string(), z.string()).default({}),
  groupId: z.string().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

/**
 * Schema for a connection between two service nodes.
 */
const connectionSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  label: z.string().optional(),
  protocol: z.string().optional(),
  port: z.number().int().positive().optional(),
  bidirectional: z.boolean().optional(),
});

/**
 * Schema for a resource group (VPC, subnet, AZ, etc.).
 */
const resourceGroupSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'region',
    'vpc',
    'subnet',
    'availability-zone',
    'security-group',
  ]),
  label: z.string().min(1),
  parentId: z.string().optional(),
  children: z.array(z.string()),
});

/**
 * Schema for architecture metadata.
 */
const architectureMetadataSchema = z.object({
  prompt: z.string().min(1),
  generatedAt: z.string().min(1),
  llmModel: z.string().min(1),
  templateId: z.string().optional(),
});

/**
 * Complete ArchitectureSpec Zod schema for validating LLM output.
 */
export const architectureSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  region: z.string().min(1),
  services: z.array(serviceNodeSchema).min(1),
  connections: z.array(connectionSchema),
  groups: z.array(resourceGroupSchema),
  metadata: architectureMetadataSchema,
});

/**
 * Result of validating an LLM response.
 */
export interface ValidationResult {
  success: true;
  data: ArchitectureSpec;
}

export interface ValidationFailure {
  success: false;
  errors: string[];
  rawResponse: string;
}

export type ArchitectureValidationResult =
  | ValidationResult
  | ValidationFailure;

/**
 * Validates a raw LLM response string against the ArchitectureSpec schema.
 *
 * Steps:
 * 1. Parse the string as JSON
 * 2. Validate against the Zod schema
 * 3. Return typed result or descriptive errors
 */
export function validateArchitectureSpec(
  rawResponse: string
): ArchitectureValidationResult {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    // Strip markdown code fences if present (LLM sometimes wraps in ```json)
    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      success: false,
      errors: ['Response is not valid JSON. The LLM did not produce parseable output.'],
      rawResponse,
    };
  }

  // Step 2: Validate against schema
  const result = architectureSpecSchema.safeParse(parsed);

  if (result.success) {
    return {
      success: true,
      data: result.data as ArchitectureSpec,
    };
  }

  // Step 3: Format errors
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path
      ? `Field "${path}": ${issue.message}`
      : issue.message;
  });

  return {
    success: false,
    errors,
    rawResponse,
  };
}

/**
 * Validates and extracts an ArchitectureSpec from a raw LLM response.
 * Throws LLMParseError if validation fails.
 */
export function parseAndValidateArchitectureSpec(
  rawResponse: string
): ArchitectureSpec {
  const result = validateArchitectureSpec(rawResponse);

  if (!result.success) {
    throw new LLMParseError(
      `LLM response failed schema validation: ${result.errors.join('; ')}`,
      rawResponse
    );
  }

  return result.data;
}
