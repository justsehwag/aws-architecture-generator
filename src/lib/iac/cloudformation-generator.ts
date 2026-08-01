/**
 * CloudFormation YAML code generator.
 *
 * Takes an ArchitectureSpec and produces CloudFormation YAML with:
 * - One resource entry per service node
 * - Parameters section with defaults derived from diagram
 * - Inter-resource references via Ref/GetAtt
 * - Comments for unsupported services
 *
 * Validates: Requirements 14.3, 14.4, 14.5
 */

import type { ArchitectureSpec, AWSServiceType } from '@/types/architecture';
import { getServiceEntry } from '@/lib/aws-service-registry';

/**
 * Mapping of AWS service types to CloudFormation resource types and properties.
 */
interface CfnResourceMapping {
  resourceType: string;
  defaultProperties: Record<string, string>;
  parameterizable: string[];
}

const CFN_RESOURCE_MAP: Partial<Record<AWSServiceType, CfnResourceMapping>> = {
  ec2: {
    resourceType: 'AWS::EC2::Instance',
    defaultProperties: { ImageId: 'ami-0c02fb55956c7d316', InstanceType: 't3.micro' },
    parameterizable: ['InstanceType', 'ImageId'],
  },
  lambda: {
    resourceType: 'AWS::Lambda::Function',
    defaultProperties: { Runtime: 'nodejs18.x', Handler: 'index.handler', MemorySize: '128', Timeout: '30' },
    parameterizable: ['Runtime', 'MemorySize', 'Timeout'],
  },
  s3: {
    resourceType: 'AWS::S3::Bucket',
    defaultProperties: { VersioningConfiguration: 'Enabled' },
    parameterizable: [],
  },
  rds: {
    resourceType: 'AWS::RDS::DBInstance',
    defaultProperties: { Engine: 'postgres', DBInstanceClass: 'db.t3.micro', AllocatedStorage: '20' },
    parameterizable: ['DBInstanceClass', 'Engine', 'AllocatedStorage'],
  },
  aurora: {
    resourceType: 'AWS::RDS::DBCluster',
    defaultProperties: { Engine: 'aurora-postgresql', EngineMode: 'provisioned' },
    parameterizable: ['Engine'],
  },
  dynamodb: {
    resourceType: 'AWS::DynamoDB::Table',
    defaultProperties: { BillingMode: 'PAY_PER_REQUEST' },
    parameterizable: ['BillingMode'],
  },
  vpc: {
    resourceType: 'AWS::EC2::VPC',
    defaultProperties: { CidrBlock: '10.0.0.0/16', EnableDnsHostnames: 'true' },
    parameterizable: ['CidrBlock'],
  },
  sqs: {
    resourceType: 'AWS::SQS::Queue',
    defaultProperties: { VisibilityTimeout: '30' },
    parameterizable: ['VisibilityTimeout'],
  },
  sns: {
    resourceType: 'AWS::SNS::Topic',
    defaultProperties: {},
    parameterizable: [],
  },
  cloudfront: {
    resourceType: 'AWS::CloudFront::Distribution',
    defaultProperties: { Enabled: 'true' },
    parameterizable: [],
  },
  route53: {
    resourceType: 'AWS::Route53::HostedZone',
    defaultProperties: {},
    parameterizable: [],
  },
  'api-gateway': {
    resourceType: 'AWS::ApiGatewayV2::Api',
    defaultProperties: { ProtocolType: 'HTTP' },
    parameterizable: ['ProtocolType'],
  },
  alb: {
    resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
    defaultProperties: { Type: 'application', Scheme: 'internet-facing' },
    parameterizable: ['Scheme'],
  },
  nlb: {
    resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
    defaultProperties: { Type: 'network', Scheme: 'internet-facing' },
    parameterizable: ['Scheme'],
  },
  elb: {
    resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
    defaultProperties: { Type: 'application', Scheme: 'internet-facing' },
    parameterizable: ['Scheme'],
  },
  ecs: {
    resourceType: 'AWS::ECS::Cluster',
    defaultProperties: {},
    parameterizable: [],
  },
  eks: {
    resourceType: 'AWS::EKS::Cluster',
    defaultProperties: { Version: '1.28' },
    parameterizable: ['Version'],
  },
  fargate: {
    resourceType: 'AWS::ECS::Service',
    defaultProperties: { LaunchType: 'FARGATE' },
    parameterizable: [],
  },
  elasticache: {
    resourceType: 'AWS::ElastiCache::CacheCluster',
    defaultProperties: { Engine: 'redis', CacheNodeType: 'cache.t3.micro', NumCacheNodes: '1' },
    parameterizable: ['CacheNodeType', 'Engine', 'NumCacheNodes'],
  },
  redshift: {
    resourceType: 'AWS::Redshift::Cluster',
    defaultProperties: { NodeType: 'dc2.large', NumberOfNodes: '1' },
    parameterizable: ['NodeType', 'NumberOfNodes'],
  },
  cognito: {
    resourceType: 'AWS::Cognito::UserPool',
    defaultProperties: {},
    parameterizable: [],
  },
  'step-functions': {
    resourceType: 'AWS::StepFunctions::StateMachine',
    defaultProperties: { StateMachineType: 'STANDARD' },
    parameterizable: ['StateMachineType'],
  },
  eventbridge: {
    resourceType: 'AWS::Events::EventBus',
    defaultProperties: {},
    parameterizable: [],
  },
  kinesis: {
    resourceType: 'AWS::Kinesis::Stream',
    defaultProperties: { ShardCount: '1' },
    parameterizable: ['ShardCount'],
  },
  cloudwatch: {
    resourceType: 'AWS::Logs::LogGroup',
    defaultProperties: { RetentionInDays: '30' },
    parameterizable: ['RetentionInDays'],
  },
  kms: {
    resourceType: 'AWS::KMS::Key',
    defaultProperties: { EnableKeyRotation: 'true' },
    parameterizable: [],
  },
  'secrets-manager': {
    resourceType: 'AWS::SecretsManager::Secret',
    defaultProperties: {},
    parameterizable: [],
  },
  waf: {
    resourceType: 'AWS::WAFv2::WebACL',
    defaultProperties: { Scope: 'REGIONAL' },
    parameterizable: ['Scope'],
  },
  'nat-gateway': {
    resourceType: 'AWS::EC2::NatGateway',
    defaultProperties: {},
    parameterizable: [],
  },
  efs: {
    resourceType: 'AWS::EFS::FileSystem',
    defaultProperties: { PerformanceMode: 'generalPurpose' },
    parameterizable: ['PerformanceMode'],
  },
  sagemaker: {
    resourceType: 'AWS::SageMaker::NotebookInstance',
    defaultProperties: { InstanceType: 'ml.t3.medium' },
    parameterizable: ['InstanceType'],
  },
  glue: {
    resourceType: 'AWS::Glue::Database',
    defaultProperties: {},
    parameterizable: [],
  },
  iam: {
    resourceType: 'AWS::IAM::Role',
    defaultProperties: {},
    parameterizable: [],
  },
};

/**
 * Convert a label to a valid CloudFormation logical ID (PascalCase, alphanumeric only).
 */
function toCfnLogicalId(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('') || 'Resource';
}

/**
 * Convert a label to a CloudFormation parameter name.
 */
function toParameterName(logicalId: string, propName: string): string {
  return `${logicalId}${propName}`;
}

/**
 * YAML indent helper.
 */
function indent(level: number): string {
  return '  '.repeat(level);
}

export interface CloudFormationGeneratorResult {
  code: string;
  warnings: string[];
  resourceCount: number;
}

/**
 * Generate CloudFormation YAML from an ArchitectureSpec.
 */
export function generateCloudFormation(spec: ArchitectureSpec): CloudFormationGeneratorResult {
  const warnings: string[] = [];
  const lines: string[] = [];
  const parameterLines: string[] = [];
  let resourceCount = 0;

  // Header
  lines.push('# CloudFormation template generated from architecture diagram');
  lines.push(`# Architecture: ${spec.name}`);
  lines.push(`# Description: ${spec.description}`);
  lines.push(`# Region: ${spec.region}`);
  lines.push(`# Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('AWSTemplateFormatVersion: "2010-09-09"');
  lines.push(`Description: "${spec.description}"`);
  lines.push('');

  // Build map of node IDs to logical IDs for references
  const nodeIdToLogicalId: Map<string, string> = new Map();

  // Collect parameters
  for (const node of spec.services) {
    const mapping = CFN_RESOURCE_MAP[node.type];
    if (!mapping) continue;

    const logicalId = toCfnLogicalId(node.label || node.id);
    nodeIdToLogicalId.set(node.id, logicalId);

    for (const param of mapping.parameterizable) {
      const paramName = toParameterName(logicalId, param);
      const defaultValue = node.properties[param] || mapping.defaultProperties[param] || '';
      parameterLines.push(`${indent(1)}${paramName}:`);
      parameterLines.push(`${indent(2)}Type: String`);
      parameterLines.push(`${indent(2)}Description: "${param} for ${node.label}"`);
      parameterLines.push(`${indent(2)}Default: "${defaultValue}"`);
    }
  }

  // Also ensure unsupported services have logical IDs
  for (const node of spec.services) {
    if (!nodeIdToLogicalId.has(node.id)) {
      nodeIdToLogicalId.set(node.id, toCfnLogicalId(node.label || node.id));
    }
  }

  // Write Parameters section
  if (parameterLines.length > 0) {
    lines.push('Parameters:');
    lines.push(...parameterLines);
    lines.push('');
  }

  // Resources section
  lines.push('Resources:');

  for (const node of spec.services) {
    const mapping = CFN_RESOURCE_MAP[node.type];
    const logicalId = nodeIdToLogicalId.get(node.id) || toCfnLogicalId(node.label || node.id);

    if (!mapping) {
      // Service not representable in CloudFormation
      const entry = getServiceEntry(node.type);
      const displayName = entry?.displayName || node.type;
      lines.push(`${indent(1)}# TODO: "${node.label}" (${displayName}) is not directly representable in CloudFormation.`);
      lines.push(`${indent(1)}# This service requires manual configuration.`);
      lines.push('');
      warnings.push(`${node.label} (${displayName}) requires manual configuration in CloudFormation`);
      resourceCount++;
      continue;
    }

    lines.push(`${indent(1)}${logicalId}:`);
    lines.push(`${indent(2)}Type: ${mapping.resourceType}`);
    lines.push(`${indent(2)}Properties:`);

    // Add properties
    for (const [key, value] of Object.entries(mapping.defaultProperties)) {
      if (mapping.parameterizable.includes(key)) {
        const paramName = toParameterName(logicalId, key);
        lines.push(`${indent(3)}${key}: !Ref ${paramName}`);
      } else {
        // Handle nested values (like VersioningConfiguration)
        if (key === 'VersioningConfiguration') {
          lines.push(`${indent(3)}VersioningConfiguration:`);
          lines.push(`${indent(4)}Status: ${value}`);
        } else {
          lines.push(`${indent(3)}${key}: "${value}"`);
        }
      }
    }

    // Add DependsOn for connected resources
    const dependencies = spec.connections
      .filter((conn) => conn.sourceId === node.id || conn.targetId === node.id)
      .map((conn) => conn.sourceId === node.id ? conn.targetId : conn.sourceId)
      .map((id) => nodeIdToLogicalId.get(id))
      .filter((id): id is string => !!id && id !== logicalId);

    // Only add DependsOn for targets that have a valid CFN mapping
    const validDeps = dependencies.filter((depId) => {
      const depNode = spec.services.find((s) => nodeIdToLogicalId.get(s.id) === depId);
      return depNode && CFN_RESOURCE_MAP[depNode.type];
    });

    if (validDeps.length > 0) {
      lines.push(`${indent(2)}DependsOn:`);
      for (const dep of Array.from(new Set(validDeps))) {
        lines.push(`${indent(3)}- ${dep}`);
      }
    }

    // Tags
    lines.push(`${indent(2)}Tags:`);
    lines.push(`${indent(3)}- Key: Name`);
    lines.push(`${indent(4)}Value: "${node.label}"`);

    lines.push('');
    resourceCount++;
  }

  // Outputs section with references
  if (spec.connections.length > 0) {
    lines.push('Outputs:');
    const outputNodes = new Set<string>();
    for (const conn of spec.connections) {
      const sourceLogicalId = nodeIdToLogicalId.get(conn.sourceId);
      const targetLogicalId = nodeIdToLogicalId.get(conn.targetId);

      if (sourceLogicalId && !outputNodes.has(sourceLogicalId)) {
        const sourceNode = spec.services.find((s) => s.id === conn.sourceId);
        if (sourceNode && CFN_RESOURCE_MAP[sourceNode.type]) {
          lines.push(`${indent(1)}${sourceLogicalId}Id:`);
          lines.push(`${indent(2)}Description: "ID of ${sourceNode.label}"`);
          lines.push(`${indent(2)}Value: !Ref ${sourceLogicalId}`);
          outputNodes.add(sourceLogicalId);
        }
      }

      if (targetLogicalId && !outputNodes.has(targetLogicalId)) {
        const targetNode = spec.services.find((s) => s.id === conn.targetId);
        if (targetNode && CFN_RESOURCE_MAP[targetNode.type]) {
          lines.push(`${indent(1)}${targetLogicalId}Id:`);
          lines.push(`${indent(2)}Description: "ID of ${targetNode.label}"`);
          lines.push(`${indent(2)}Value: !Ref ${targetLogicalId}`);
          outputNodes.add(targetLogicalId);
        }
      }
    }
  }

  return {
    code: lines.join('\n'),
    warnings,
    resourceCount,
  };
}
