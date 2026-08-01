/**
 * Terraform code generator.
 *
 * Takes an ArchitectureSpec and produces a Terraform HCL string with:
 * - One resource block per service node
 * - Variables block for configurable properties (instance types, CIDR blocks, naming)
 * - Inter-resource references reflecting diagram connections
 * - Comments for unsupported services
 *
 * Validates: Requirements 14.1, 14.4, 14.5
 */

import type { ArchitectureSpec, Connection, AWSServiceType } from '@/types/architecture';
import { getServiceEntry } from '@/lib/aws-service-registry';

/**
 * Mapping of AWS service types to their Terraform resource type and default properties.
 */
interface TerraformResourceMapping {
  resourceType: string;
  defaultProperties: Record<string, string>;
  /** Parameters that should be extracted as variables */
  parameterizable: string[];
}

const TERRAFORM_RESOURCE_MAP: Partial<Record<AWSServiceType, TerraformResourceMapping>> = {
  ec2: {
    resourceType: 'aws_instance',
    defaultProperties: { ami: 'ami-0c02fb55956c7d316', instance_type: 't3.micro' },
    parameterizable: ['instance_type', 'ami'],
  },
  lambda: {
    resourceType: 'aws_lambda_function',
    defaultProperties: { runtime: 'nodejs18.x', handler: 'index.handler', memory_size: '128', timeout: '30' },
    parameterizable: ['runtime', 'memory_size', 'timeout'],
  },
  s3: {
    resourceType: 'aws_s3_bucket',
    defaultProperties: {},
    parameterizable: [],
  },
  rds: {
    resourceType: 'aws_db_instance',
    defaultProperties: { engine: 'postgres', instance_class: 'db.t3.micro', allocated_storage: '20' },
    parameterizable: ['instance_class', 'engine', 'allocated_storage'],
  },
  aurora: {
    resourceType: 'aws_rds_cluster',
    defaultProperties: { engine: 'aurora-postgresql', engine_mode: 'provisioned' },
    parameterizable: ['engine'],
  },
  dynamodb: {
    resourceType: 'aws_dynamodb_table',
    defaultProperties: { billing_mode: 'PAY_PER_REQUEST', hash_key: 'id' },
    parameterizable: ['billing_mode'],
  },
  vpc: {
    resourceType: 'aws_vpc',
    defaultProperties: { cidr_block: '10.0.0.0/16', enable_dns_hostnames: 'true' },
    parameterizable: ['cidr_block'],
  },
  sqs: {
    resourceType: 'aws_sqs_queue',
    defaultProperties: { visibility_timeout_seconds: '30' },
    parameterizable: ['visibility_timeout_seconds'],
  },
  sns: {
    resourceType: 'aws_sns_topic',
    defaultProperties: {},
    parameterizable: [],
  },
  cloudfront: {
    resourceType: 'aws_cloudfront_distribution',
    defaultProperties: { enabled: 'true' },
    parameterizable: [],
  },
  route53: {
    resourceType: 'aws_route53_zone',
    defaultProperties: {},
    parameterizable: [],
  },
  'api-gateway': {
    resourceType: 'aws_apigatewayv2_api',
    defaultProperties: { protocol_type: 'HTTP' },
    parameterizable: ['protocol_type'],
  },
  alb: {
    resourceType: 'aws_lb',
    defaultProperties: { load_balancer_type: 'application', internal: 'false' },
    parameterizable: ['internal'],
  },
  nlb: {
    resourceType: 'aws_lb',
    defaultProperties: { load_balancer_type: 'network', internal: 'false' },
    parameterizable: ['internal'],
  },
  elb: {
    resourceType: 'aws_lb',
    defaultProperties: { load_balancer_type: 'application', internal: 'false' },
    parameterizable: ['internal'],
  },
  ecs: {
    resourceType: 'aws_ecs_cluster',
    defaultProperties: {},
    parameterizable: [],
  },
  eks: {
    resourceType: 'aws_eks_cluster',
    defaultProperties: { version: '1.28' },
    parameterizable: ['version'],
  },
  fargate: {
    resourceType: 'aws_ecs_service',
    defaultProperties: { launch_type: 'FARGATE' },
    parameterizable: [],
  },
  elasticache: {
    resourceType: 'aws_elasticache_cluster',
    defaultProperties: { engine: 'redis', node_type: 'cache.t3.micro', num_cache_nodes: '1' },
    parameterizable: ['node_type', 'engine', 'num_cache_nodes'],
  },
  redshift: {
    resourceType: 'aws_redshift_cluster',
    defaultProperties: { node_type: 'dc2.large', number_of_nodes: '1' },
    parameterizable: ['node_type', 'number_of_nodes'],
  },
  cognito: {
    resourceType: 'aws_cognito_user_pool',
    defaultProperties: {},
    parameterizable: [],
  },
  'step-functions': {
    resourceType: 'aws_sfn_state_machine',
    defaultProperties: { type: 'STANDARD' },
    parameterizable: ['type'],
  },
  eventbridge: {
    resourceType: 'aws_cloudwatch_event_bus',
    defaultProperties: {},
    parameterizable: [],
  },
  kinesis: {
    resourceType: 'aws_kinesis_stream',
    defaultProperties: { shard_count: '1' },
    parameterizable: ['shard_count'],
  },
  cloudwatch: {
    resourceType: 'aws_cloudwatch_log_group',
    defaultProperties: { retention_in_days: '30' },
    parameterizable: ['retention_in_days'],
  },
  kms: {
    resourceType: 'aws_kms_key',
    defaultProperties: { enable_key_rotation: 'true' },
    parameterizable: [],
  },
  'secrets-manager': {
    resourceType: 'aws_secretsmanager_secret',
    defaultProperties: {},
    parameterizable: [],
  },
  waf: {
    resourceType: 'aws_wafv2_web_acl',
    defaultProperties: { scope: 'REGIONAL' },
    parameterizable: ['scope'],
  },
  'nat-gateway': {
    resourceType: 'aws_nat_gateway',
    defaultProperties: {},
    parameterizable: [],
  },
  efs: {
    resourceType: 'aws_efs_file_system',
    defaultProperties: { performance_mode: 'generalPurpose' },
    parameterizable: ['performance_mode'],
  },
  sagemaker: {
    resourceType: 'aws_sagemaker_notebook_instance',
    defaultProperties: { instance_type: 'ml.t3.medium' },
    parameterizable: ['instance_type'],
  },
  glue: {
    resourceType: 'aws_glue_catalog_database',
    defaultProperties: {},
    parameterizable: [],
  },
  iam: {
    resourceType: 'aws_iam_role',
    defaultProperties: {},
    parameterizable: [],
  },
};

/**
 * Sanitize a label into a valid Terraform identifier.
 */
function toTerraformId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'resource';
}

/**
 * Sanitize a label into a valid Terraform variable name.
 */
function toVariableName(serviceId: string, propName: string): string {
  const sanitized = toTerraformId(serviceId);
  return `${sanitized}_${propName}`;
}

export interface TerraformGeneratorResult {
  code: string;
  warnings: string[];
  resourceCount: number;
}

/**
 * Generate Terraform HCL code from an ArchitectureSpec.
 */
export function generateTerraform(spec: ArchitectureSpec): TerraformGeneratorResult {
  const warnings: string[] = [];
  const lines: string[] = [];
  const variables: string[] = [];
  let resourceCount = 0;

  // Header comment
  lines.push('# Terraform configuration generated from architecture diagram');
  lines.push(`# Architecture: ${spec.name}`);
  lines.push(`# Description: ${spec.description}`);
  lines.push(`# Region: ${spec.region}`);
  lines.push(`# Generated at: ${new Date().toISOString()}`);
  lines.push('');

  // Provider block
  lines.push('terraform {');
  lines.push('  required_providers {');
  lines.push('    aws = {');
  lines.push('      source  = "hashicorp/aws"');
  lines.push('      version = "~> 5.0"');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('provider "aws" {');
  lines.push(`  region = var.aws_region`);
  lines.push('}');
  lines.push('');

  // Region variable
  variables.push('variable "aws_region" {');
  variables.push('  description = "AWS region for resource deployment"');
  variables.push('  type        = string');
  variables.push(`  default     = "${spec.region || 'us-east-1'}"`);
  variables.push('}');
  variables.push('');

  // Build a map of node IDs to terraform identifiers for references
  const nodeIdToTfId: Map<string, { resourceType: string; tfName: string }> = new Map();

  // Generate resource blocks
  for (const node of spec.services) {
    const mapping = TERRAFORM_RESOURCE_MAP[node.type];
    const tfName = toTerraformId(node.label || node.id);

    if (!mapping) {
      // Service not representable in Terraform - add comment
      const entry = getServiceEntry(node.type);
      const displayName = entry?.displayName || node.type;
      lines.push(`# TODO: "${node.label}" (${displayName}) is not directly representable in Terraform.`);
      lines.push(`# This service requires manual configuration.`);
      lines.push('');
      warnings.push(`${node.label} (${displayName}) requires manual configuration in Terraform`);
      resourceCount++;
      nodeIdToTfId.set(node.id, { resourceType: 'manual', tfName });
      continue;
    }

    nodeIdToTfId.set(node.id, { resourceType: mapping.resourceType, tfName });

    // Generate variables for parameterizable properties
    for (const param of mapping.parameterizable) {
      const varName = toVariableName(tfName, param);
      const defaultValue = node.properties[param] || mapping.defaultProperties[param] || '';
      variables.push(`variable "${varName}" {`);
      variables.push(`  description = "${param} for ${node.label}"`);
      variables.push('  type        = string');
      variables.push(`  default     = "${defaultValue}"`);
      variables.push('}');
      variables.push('');
    }

    // Generate resource block
    lines.push(`resource "${mapping.resourceType}" "${tfName}" {`);

    // Add name tag
    lines.push(`  tags = {`);
    lines.push(`    Name = "${node.label}"`);
    lines.push(`  }`);
    lines.push('');

    // Add properties (parameterizable use var references, others use defaults)
    for (const [key, value] of Object.entries(mapping.defaultProperties)) {
      if (mapping.parameterizable.includes(key)) {
        const varName = toVariableName(tfName, key);
        lines.push(`  ${key} = var.${varName}`);
      } else {
        lines.push(`  ${key} = "${value}"`);
      }
    }

    // Add any diagram-specific properties as extra attributes
    for (const [key, value] of Object.entries(node.properties)) {
      if (!mapping.defaultProperties[key] && !mapping.parameterizable.includes(key)) {
        lines.push(`  # From diagram: ${key} = "${value}"`);
      }
    }

    lines.push('}');
    lines.push('');
    resourceCount++;
  }

  // Add connection references as comments and depends_on where applicable
  const connectionComments = generateConnectionComments(spec.connections, nodeIdToTfId);
  if (connectionComments.length > 0) {
    lines.push('# ─── Inter-resource references ───────────────────────────────────────────────');
    lines.push('');
    lines.push(...connectionComments);
  }

  // Assemble final output: variables first, then resources
  const output: string[] = [];
  output.push(...lines.slice(0, lines.indexOf(''))); // header
  output.push('');
  // Find where provider ends and add variables
  const providerEndIdx = lines.findIndex((l, i) => i > 5 && l === '' && lines[i - 1] === '}');
  const headerAndProvider = lines.slice(0, providerEndIdx + 1);
  const resources = lines.slice(providerEndIdx + 1);

  const finalOutput = [
    ...headerAndProvider,
    '',
    '# ─── Variables ───────────────────────────────────────────────────────────────',
    '',
    ...variables,
    '# ─── Resources ───────────────────────────────────────────────────────────────',
    '',
    ...resources,
  ];

  return {
    code: finalOutput.join('\n'),
    warnings,
    resourceCount,
  };
}

/**
 * Generate comments showing inter-resource references.
 */
function generateConnectionComments(
  connections: Connection[],
  nodeIdToTfId: Map<string, { resourceType: string; tfName: string }>
): string[] {
  const lines: string[] = [];

  for (const conn of connections) {
    const source = nodeIdToTfId.get(conn.sourceId);
    const target = nodeIdToTfId.get(conn.targetId);

    if (!source || !target) continue;

    const label = conn.label ? ` (${conn.label})` : '';
    const protocol = conn.protocol ? ` via ${conn.protocol}` : '';
    const port = conn.port ? `:${conn.port}` : '';

    if (source.resourceType === 'manual' || target.resourceType === 'manual') {
      lines.push(`# Connection${label}: ${source.tfName} -> ${target.tfName}${protocol}${port} (manual resource involved)`);
    } else {
      lines.push(`# Connection${label}: ${source.resourceType}.${source.tfName} -> ${target.resourceType}.${target.tfName}${protocol}${port}`);
      lines.push(`# Reference: \${${source.resourceType}.${source.tfName}.id} / \${${target.resourceType}.${target.tfName}.id}`);
    }
    lines.push('');
  }

  return lines;
}
