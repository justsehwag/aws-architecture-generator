/**
 * CDK TypeScript code generator.
 *
 * Takes an ArchitectureSpec and produces TypeScript CDK code with:
 * - One construct per service node
 * - Props/parameters for configurable values
 * - Inter-resource references reflecting diagram connections
 * - Comments for unsupported services
 *
 * Validates: Requirements 14.2, 14.4, 14.5
 */

import type { ArchitectureSpec, AWSServiceType } from '@/types/architecture';
import { getServiceEntry } from '@/lib/aws-service-registry';

/**
 * Mapping of AWS service types to CDK construct info.
 */
interface CdkConstructMapping {
  module: string;
  constructName: string;
  defaultProps: Record<string, string>;
  parameterizable: string[];
}

const CDK_CONSTRUCT_MAP: Partial<Record<AWSServiceType, CdkConstructMapping>> = {
  ec2: {
    module: 'aws-cdk-lib/aws-ec2',
    constructName: 'Instance',
    defaultProps: { instanceType: "ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO)", machineImage: 'new ec2.AmazonLinuxImage()' },
    parameterizable: ['instanceType'],
  },
  lambda: {
    module: 'aws-cdk-lib/aws-lambda',
    constructName: 'Function',
    defaultProps: { runtime: 'lambda.Runtime.NODEJS_18_X', handler: "'index.handler'", memorySize: '128', timeout: 'cdk.Duration.seconds(30)' },
    parameterizable: ['memorySize', 'timeout'],
  },
  s3: {
    module: 'aws-cdk-lib/aws-s3',
    constructName: 'Bucket',
    defaultProps: { versioned: 'true', removalPolicy: 'cdk.RemovalPolicy.RETAIN' },
    parameterizable: [],
  },
  rds: {
    module: 'aws-cdk-lib/aws-rds',
    constructName: 'DatabaseInstance',
    defaultProps: { engine: "rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 })", instanceType: "ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO)", allocatedStorage: '20' },
    parameterizable: ['instanceType', 'allocatedStorage'],
  },
  aurora: {
    module: 'aws-cdk-lib/aws-rds',
    constructName: 'DatabaseCluster',
    defaultProps: { engine: "rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_15_2 })" },
    parameterizable: [],
  },
  dynamodb: {
    module: 'aws-cdk-lib/aws-dynamodb',
    constructName: 'Table',
    defaultProps: { billingMode: 'dynamodb.BillingMode.PAY_PER_REQUEST', partitionKey: "{ name: 'id', type: dynamodb.AttributeType.STRING }" },
    parameterizable: ['billingMode'],
  },
  vpc: {
    module: 'aws-cdk-lib/aws-ec2',
    constructName: 'Vpc',
    defaultProps: { maxAzs: '2', cidr: "'10.0.0.0/16'" },
    parameterizable: ['maxAzs', 'cidr'],
  },
  sqs: {
    module: 'aws-cdk-lib/aws-sqs',
    constructName: 'Queue',
    defaultProps: { visibilityTimeout: 'cdk.Duration.seconds(30)' },
    parameterizable: ['visibilityTimeout'],
  },
  sns: {
    module: 'aws-cdk-lib/aws-sns',
    constructName: 'Topic',
    defaultProps: {},
    parameterizable: [],
  },
  cloudfront: {
    module: 'aws-cdk-lib/aws-cloudfront',
    constructName: 'Distribution',
    defaultProps: {},
    parameterizable: [],
  },
  'api-gateway': {
    module: 'aws-cdk-lib/aws-apigatewayv2',
    constructName: 'HttpApi',
    defaultProps: {},
    parameterizable: [],
  },
  alb: {
    module: 'aws-cdk-lib/aws-elasticloadbalancingv2',
    constructName: 'ApplicationLoadBalancer',
    defaultProps: { internetFacing: 'true' },
    parameterizable: ['internetFacing'],
  },
  nlb: {
    module: 'aws-cdk-lib/aws-elasticloadbalancingv2',
    constructName: 'NetworkLoadBalancer',
    defaultProps: { internetFacing: 'true' },
    parameterizable: ['internetFacing'],
  },
  elb: {
    module: 'aws-cdk-lib/aws-elasticloadbalancingv2',
    constructName: 'ApplicationLoadBalancer',
    defaultProps: { internetFacing: 'true' },
    parameterizable: ['internetFacing'],
  },
  ecs: {
    module: 'aws-cdk-lib/aws-ecs',
    constructName: 'Cluster',
    defaultProps: {},
    parameterizable: [],
  },
  eks: {
    module: 'aws-cdk-lib/aws-eks',
    constructName: 'Cluster',
    defaultProps: { version: "eks.KubernetesVersion.V1_28" },
    parameterizable: ['version'],
  },
  fargate: {
    module: 'aws-cdk-lib/aws-ecs',
    constructName: 'FargateService',
    defaultProps: {},
    parameterizable: [],
  },
  elasticache: {
    module: 'aws-cdk-lib/aws-elasticache',
    constructName: 'CfnCacheCluster',
    defaultProps: { engine: "'redis'", cacheNodeType: "'cache.t3.micro'", numCacheNodes: '1' },
    parameterizable: ['cacheNodeType', 'numCacheNodes'],
  },
  cognito: {
    module: 'aws-cdk-lib/aws-cognito',
    constructName: 'UserPool',
    defaultProps: { selfSignUpEnabled: 'true' },
    parameterizable: [],
  },
  'step-functions': {
    module: 'aws-cdk-lib/aws-stepfunctions',
    constructName: 'StateMachine',
    defaultProps: { stateMachineType: 'sfn.StateMachineType.STANDARD' },
    parameterizable: [],
  },
  eventbridge: {
    module: 'aws-cdk-lib/aws-events',
    constructName: 'EventBus',
    defaultProps: {},
    parameterizable: [],
  },
  kinesis: {
    module: 'aws-cdk-lib/aws-kinesis',
    constructName: 'Stream',
    defaultProps: { shardCount: '1' },
    parameterizable: ['shardCount'],
  },
  cloudwatch: {
    module: 'aws-cdk-lib/aws-logs',
    constructName: 'LogGroup',
    defaultProps: { retention: 'logs.RetentionDays.ONE_MONTH' },
    parameterizable: ['retention'],
  },
  kms: {
    module: 'aws-cdk-lib/aws-kms',
    constructName: 'Key',
    defaultProps: { enableKeyRotation: 'true' },
    parameterizable: [],
  },
  'secrets-manager': {
    module: 'aws-cdk-lib/aws-secretsmanager',
    constructName: 'Secret',
    defaultProps: {},
    parameterizable: [],
  },
  waf: {
    module: 'aws-cdk-lib/aws-wafv2',
    constructName: 'CfnWebACL',
    defaultProps: { scope: "'REGIONAL'" },
    parameterizable: ['scope'],
  },
  'nat-gateway': {
    module: 'aws-cdk-lib/aws-ec2',
    constructName: 'CfnNatGateway',
    defaultProps: {},
    parameterizable: [],
  },
  efs: {
    module: 'aws-cdk-lib/aws-efs',
    constructName: 'FileSystem',
    defaultProps: { performanceMode: 'efs.PerformanceMode.GENERAL_PURPOSE' },
    parameterizable: ['performanceMode'],
  },
  sagemaker: {
    module: 'aws-cdk-lib/aws-sagemaker',
    constructName: 'CfnNotebookInstance',
    defaultProps: { instanceType: "'ml.t3.medium'" },
    parameterizable: ['instanceType'],
  },
  iam: {
    module: 'aws-cdk-lib/aws-iam',
    constructName: 'Role',
    defaultProps: { assumedBy: "new iam.ServicePrincipal('lambda.amazonaws.com')" },
    parameterizable: [],
  },
};

/**
 * Convert a label to a valid TypeScript/CDK identifier (PascalCase).
 */
function toCdkId(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('') || 'Resource';
}

/**
 * Convert a label to a camelCase variable name.
 */
function toCamelCase(label: string): string {
  const pascal = toCdkId(label);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export interface CdkGeneratorResult {
  code: string;
  warnings: string[];
  resourceCount: number;
}

/**
 * Generate CDK TypeScript code from an ArchitectureSpec.
 */
export function generateCdk(spec: ArchitectureSpec): CdkGeneratorResult {
  const warnings: string[] = [];
  const lines: string[] = [];
  let resourceCount = 0;

  // Collect imports
  const imports = new Set<string>();
  imports.add("import * as cdk from 'aws-cdk-lib';");
  imports.add("import { Construct } from 'constructs';");

  // Determine which modules are needed
  const modulesUsed = new Set<string>();
  for (const node of spec.services) {
    const mapping = CDK_CONSTRUCT_MAP[node.type];
    if (mapping) {
      modulesUsed.add(mapping.module);
    }
  }

  // Map modules to import aliases
  const moduleAliases: Record<string, string> = {
    'aws-cdk-lib/aws-ec2': 'ec2',
    'aws-cdk-lib/aws-lambda': 'lambda',
    'aws-cdk-lib/aws-s3': 's3',
    'aws-cdk-lib/aws-rds': 'rds',
    'aws-cdk-lib/aws-dynamodb': 'dynamodb',
    'aws-cdk-lib/aws-sqs': 'sqs',
    'aws-cdk-lib/aws-sns': 'sns',
    'aws-cdk-lib/aws-cloudfront': 'cloudfront',
    'aws-cdk-lib/aws-apigatewayv2': 'apigw',
    'aws-cdk-lib/aws-elasticloadbalancingv2': 'elbv2',
    'aws-cdk-lib/aws-ecs': 'ecs',
    'aws-cdk-lib/aws-eks': 'eks',
    'aws-cdk-lib/aws-elasticache': 'elasticache',
    'aws-cdk-lib/aws-cognito': 'cognito',
    'aws-cdk-lib/aws-stepfunctions': 'sfn',
    'aws-cdk-lib/aws-events': 'events',
    'aws-cdk-lib/aws-kinesis': 'kinesis',
    'aws-cdk-lib/aws-logs': 'logs',
    'aws-cdk-lib/aws-kms': 'kms',
    'aws-cdk-lib/aws-secretsmanager': 'secretsmanager',
    'aws-cdk-lib/aws-wafv2': 'wafv2',
    'aws-cdk-lib/aws-efs': 'efs',
    'aws-cdk-lib/aws-sagemaker': 'sagemaker',
    'aws-cdk-lib/aws-iam': 'iam',
  };

  for (const mod of Array.from(modulesUsed)) {
    const alias = moduleAliases[mod] || mod.split('/').pop()?.replace('aws-', '') || 'service';
    imports.add(`import * as ${alias} from '${mod}';`);
  }

  // Header
  lines.push('// CDK TypeScript code generated from architecture diagram');
  lines.push(`// Architecture: ${spec.name}`);
  lines.push(`// Description: ${spec.description}`);
  lines.push(`// Region: ${spec.region}`);
  lines.push(`// Generated at: ${new Date().toISOString()}`);
  lines.push('');

  // Imports
  lines.push(...Array.from(imports).sort());
  lines.push('');

  // Stack Props interface
  const propsEntries: string[] = [];
  for (const node of spec.services) {
    const mapping = CDK_CONSTRUCT_MAP[node.type];
    if (!mapping) continue;
    for (const param of mapping.parameterizable) {
      const propName = `${toCamelCase(node.label)}${param.charAt(0).toUpperCase() + param.slice(1)}`;
      propsEntries.push(`  /** ${param} for ${node.label} */`);
      propsEntries.push(`  readonly ${propName}?: string;`);
    }
  }

  if (propsEntries.length > 0) {
    lines.push(`export interface ${toCdkId(spec.name)}StackProps extends cdk.StackProps {`);
    lines.push(...propsEntries);
    lines.push('}');
    lines.push('');
  }

  // Stack class
  const stackName = `${toCdkId(spec.name)}Stack`;
  const propsType = propsEntries.length > 0 ? `${toCdkId(spec.name)}StackProps` : 'cdk.StackProps';

  lines.push(`export class ${stackName} extends cdk.Stack {`);
  lines.push(`  constructor(scope: Construct, id: string, props?: ${propsType}) {`);
  lines.push('    super(scope, id, props);');
  lines.push('');

  // Track variable names for reference generation
  const nodeIdToVarName: Map<string, string> = new Map();

  // Generate constructs
  for (const node of spec.services) {
    const mapping = CDK_CONSTRUCT_MAP[node.type];
    const varName = toCamelCase(node.label || node.id);

    if (!mapping) {
      // Service not representable in CDK
      const entry = getServiceEntry(node.type);
      const displayName = entry?.displayName || node.type;
      lines.push(`    // TODO: "${node.label}" (${displayName}) is not directly representable as a CDK construct.`);
      lines.push(`    // This service requires manual configuration.`);
      lines.push('');
      warnings.push(`${node.label} (${displayName}) requires manual configuration in CDK`);
      resourceCount++;
      nodeIdToVarName.set(node.id, varName);
      continue;
    }

    nodeIdToVarName.set(node.id, varName);
    const alias = moduleAliases[mapping.module] || 'service';
    const constructId = toCdkId(node.label || node.id);

    lines.push(`    const ${varName} = new ${alias}.${mapping.constructName}(this, '${constructId}', {`);

    // Add properties
    for (const [key, value] of Object.entries(mapping.defaultProps)) {
      if (mapping.parameterizable.includes(key)) {
        const propName = `${toCamelCase(node.label)}${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const defaultVal = node.properties[key] || value;
        lines.push(`      ${key}: props?.${propName} ?? ${defaultVal},`);
      } else {
        lines.push(`      ${key}: ${value},`);
      }
    }

    lines.push('    });');
    lines.push('');
    resourceCount++;
  }

  // Add connection references
  if (spec.connections.length > 0) {
    lines.push('    // ─── Inter-resource references ─────────────────────────────────────────');
    lines.push('');
    for (const conn of spec.connections) {
      const sourceVar = nodeIdToVarName.get(conn.sourceId);
      const targetVar = nodeIdToVarName.get(conn.targetId);
      if (!sourceVar || !targetVar) continue;

      const label = conn.label ? ` (${conn.label})` : '';
      const protocol = conn.protocol ? ` via ${conn.protocol}` : '';
      const port = conn.port ? `:${conn.port}` : '';
      lines.push(`    // Connection${label}: ${sourceVar} -> ${targetVar}${protocol}${port}`);
    }
    lines.push('');
  }

  lines.push('  }');
  lines.push('}');
  lines.push('');

  // App entry point
  lines.push('// App entry point');
  lines.push('const app = new cdk.App();');
  lines.push(`new ${stackName}(app, '${stackName}', {`);
  lines.push(`  env: { region: '${spec.region || 'us-east-1'}' },`);
  lines.push('});');
  lines.push('');

  return {
    code: lines.join('\n'),
    warnings,
    resourceCount,
  };
}
