/**
 * IaC Lambda Handler
 *
 * Generates Infrastructure as Code (Terraform, CDK TypeScript, CloudFormation)
 * from a diagram's architecture specification.
 *
 * Connected to API Gateway at POST /api/diagrams/{id}/iac
 *
 * Environment Variables:
 * - DIAGRAMS_TABLE: DynamoDB table name
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// ============================================================
// Types
// ============================================================

interface APIGatewayEvent {
  body: string | null;
  headers: Record<string, string | undefined>;
  httpMethod?: string;
  requestContext: {
    authorizer?: { jwt?: { claims?: { sub?: string } } };
    http?: { method: string };
  };
  pathParameters?: Record<string, string>;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface ServiceNode {
  id: string;
  type: string;
  label: string;
  properties?: Record<string, string>;
}

interface Connection {
  sourceId: string;
  targetId: string;
  label?: string;
}

const SUPPORTED_IAC_FORMATS = ['terraform', 'cdk', 'cloudformation'];
const MAX_RESOURCES = 50;

// ============================================================
// Clients
// ============================================================

const REGION = process.env.REGION || 'us-east-1';
const DIAGRAMS_TABLE = process.env.DIAGRAMS_TABLE || '';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ============================================================
// Helpers
// ============================================================

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

// Mapping service types to Terraform resource types
const TERRAFORM_RESOURCES: Record<string, string> = {
  ec2: 'aws_instance', lambda: 'aws_lambda_function', s3: 'aws_s3_bucket',
  dynamodb: 'aws_dynamodb_table', rds: 'aws_db_instance', aurora: 'aws_rds_cluster',
  'api-gateway': 'aws_apigatewayv2_api', alb: 'aws_lb', nlb: 'aws_lb',
  ecs: 'aws_ecs_cluster', eks: 'aws_eks_cluster', fargate: 'aws_ecs_service',
  sqs: 'aws_sqs_queue', sns: 'aws_sns_topic', cloudfront: 'aws_cloudfront_distribution',
  route53: 'aws_route53_zone', cognito: 'aws_cognito_user_pool',
  vpc: 'aws_vpc', kms: 'aws_kms_key', waf: 'aws_wafv2_web_acl',
  cloudwatch: 'aws_cloudwatch_log_group', 'nat-gateway': 'aws_nat_gateway',
  'step-functions': 'aws_sfn_state_machine', kinesis: 'aws_kinesis_stream',
  elasticache: 'aws_elasticache_cluster', redshift: 'aws_redshift_cluster',
  eventbridge: 'aws_cloudwatch_event_rule', opensearch: 'aws_opensearch_domain',
  sagemaker: 'aws_sagemaker_notebook_instance', bedrock: 'aws_bedrock_custom_model',
};

// Mapping to CDK construct names
const CDK_CONSTRUCTS: Record<string, string> = {
  ec2: 'ec2.Instance', lambda: 'lambda.Function', s3: 's3.Bucket',
  dynamodb: 'dynamodb.Table', rds: 'rds.DatabaseInstance', aurora: 'rds.DatabaseCluster',
  'api-gateway': 'apigw.HttpApi', alb: 'elbv2.ApplicationLoadBalancer',
  ecs: 'ecs.Cluster', eks: 'eks.Cluster', fargate: 'ecs_patterns.ApplicationLoadBalancedFargateService',
  sqs: 'sqs.Queue', sns: 'sns.Topic', cloudfront: 'cloudfront.Distribution',
  route53: 'route53.HostedZone', cognito: 'cognito.UserPool',
  vpc: 'ec2.Vpc', kms: 'kms.Key', waf: 'wafv2.CfnWebACL',
  cloudwatch: 'logs.LogGroup', 'nat-gateway': 'ec2.NatGateway',
  'step-functions': 'sfn.StateMachine', kinesis: 'kinesis.Stream',
};

// Mapping to CloudFormation resource types
const CFN_RESOURCES: Record<string, string> = {
  ec2: 'AWS::EC2::Instance', lambda: 'AWS::Lambda::Function', s3: 'AWS::S3::Bucket',
  dynamodb: 'AWS::DynamoDB::Table', rds: 'AWS::RDS::DBInstance', aurora: 'AWS::RDS::DBCluster',
  'api-gateway': 'AWS::ApiGatewayV2::Api', alb: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
  ecs: 'AWS::ECS::Cluster', eks: 'AWS::EKS::Cluster', fargate: 'AWS::ECS::Service',
  sqs: 'AWS::SQS::Queue', sns: 'AWS::SNS::Topic', cloudfront: 'AWS::CloudFront::Distribution',
  route53: 'AWS::Route53::HostedZone', cognito: 'AWS::Cognito::UserPool',
  vpc: 'AWS::EC2::VPC', kms: 'AWS::KMS::Key', waf: 'AWS::WAFv2::WebACL',
};

// ============================================================
// IaC Generators
// ============================================================

function toSnakeCase(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function toCamelCase(label: string): string {
  return label.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '');
}

function generateTerraform(services: ServiceNode[], connections: Connection[]): { code: string; warnings: string[] } {
  const warnings: string[] = [];
  let code = `# Generated by Cloud Architecture Generator\n# Terraform configuration\n\nterraform {\n  required_providers {\n    aws = {\n      source  = "hashicorp/aws"\n      version = "~> 5.0"\n    }\n  }\n}\n\nprovider "aws" {\n  region = var.aws_region\n}\n\nvariable "aws_region" {\n  default = "us-east-1"\n}\n\n`;

  for (const svc of services) {
    const resourceType = TERRAFORM_RESOURCES[svc.type];
    const name = toSnakeCase(svc.label);

    if (!resourceType) {
      warnings.push(`Service "${svc.label}" (type: ${svc.type}) has no Terraform equivalent — skipped.`);
      code += `# ${svc.label} (${svc.type}) - not representable in Terraform\n\n`;
      continue;
    }

    code += `resource "${resourceType}" "${name}" {\n`;
    code += `  # ${svc.label}\n`;
    if (svc.properties) {
      for (const [k, v] of Object.entries(svc.properties)) {
        code += `  ${k} = "${v}"\n`;
      }
    }
    code += `  tags = {\n    Name = "${svc.label}"\n  }\n}\n\n`;
  }

  return { code, warnings };
}

function generateCDK(services: ServiceNode[], connections: Connection[]): { code: string; warnings: string[] } {
  const warnings: string[] = [];
  let code = `// Generated by Cloud Architecture Generator\n// AWS CDK TypeScript\n\nimport * as cdk from 'aws-cdk-lib';\nimport { Construct } from 'constructs';\n\nexport class ArchitectureStack extends cdk.Stack {\n  constructor(scope: Construct, id: string, props?: cdk.StackProps) {\n    super(scope, id, props);\n\n`;

  for (const svc of services) {
    const construct = CDK_CONSTRUCTS[svc.type];
    const name = toCamelCase(svc.label);

    if (!construct) {
      warnings.push(`Service "${svc.label}" (type: ${svc.type}) has no CDK construct — skipped.`);
      code += `    // ${svc.label} (${svc.type}) - not representable in CDK\n\n`;
      continue;
    }

    code += `    // ${svc.label}\n`;
    code += `    const ${name} = new ${construct}(this, '${svc.label.replace(/[^a-zA-Z0-9]/g, '')}', {\n`;
    code += `      // Configure properties as needed\n`;
    code += `    });\n\n`;
  }

  code += `  }\n}\n`;
  return { code, warnings };
}

function generateCloudFormation(services: ServiceNode[], connections: Connection[]): { code: string; warnings: string[] } {
  const warnings: string[] = [];
  let code = `# Generated by Cloud Architecture Generator\n# CloudFormation YAML\n\nAWSTemplateFormatVersion: '2010-09-09'\nDescription: Architecture generated from diagram\n\nParameters:\n  Environment:\n    Type: String\n    Default: production\n\nResources:\n`;

  for (const svc of services) {
    const resourceType = CFN_RESOURCES[svc.type];
    const logicalId = svc.label.replace(/[^a-zA-Z0-9]/g, '');

    if (!resourceType) {
      warnings.push(`Service "${svc.label}" (type: ${svc.type}) has no CloudFormation equivalent — skipped.`);
      code += `  # ${svc.label} (${svc.type}) - not representable in CloudFormation\n\n`;
      continue;
    }

    code += `  ${logicalId}:\n    Type: ${resourceType}\n    Properties:\n      Tags:\n        - Key: Name\n          Value: ${svc.label}\n\n`;
  }

  code += `Outputs:\n  StackName:\n    Value: !Ref AWS::StackName\n`;
  return { code, warnings };
}

// ============================================================
// Lambda Handler
// ============================================================

export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'POST';
  if (method === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: '' };

  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || event.headers?.['x-user-id'] || 'anonymous';
  const diagramId = event.pathParameters?.id;

  if (!diagramId) return jsonResponse(400, { error: 'Diagram ID is required' });
  if (!event.body) return jsonResponse(400, { error: 'Request body is required' });

  let body: { format?: string };
  try { body = JSON.parse(event.body); } catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

  const format = body.format?.toLowerCase();
  if (!format || !SUPPORTED_IAC_FORMATS.includes(format)) {
    return jsonResponse(400, {
      error: `Unsupported IaC format: "${format}". Supported: ${SUPPORTED_IAC_FORMATS.join(', ')}`,
      supportedFormats: SUPPORTED_IAC_FORMATS,
    });
  }

  // Retrieve diagram from DynamoDB
  let diagramRecord;
  try {
    const result = await ddbDocClient.send(new GetCommand({
      TableName: DIAGRAMS_TABLE,
      Key: { PK: `USER#${userId}`, SK: `DIAGRAM#${diagramId}` },
    }));
    diagramRecord = result.Item;
  } catch (error) {
    console.error('DynamoDB error:', error);
    return jsonResponse(500, { error: 'Failed to retrieve diagram' });
  }

  if (!diagramRecord) return jsonResponse(404, { error: 'Diagram not found' });

  // Parse architecture spec
  let spec: { services?: ServiceNode[]; connections?: Connection[] };
  try {
    spec = typeof diagramRecord.architectureSpec === 'string'
      ? JSON.parse(diagramRecord.architectureSpec)
      : diagramRecord.architectureSpec || {};
  } catch {
    return jsonResponse(500, { error: 'Failed to parse architecture specification.' });
  }

  const services = spec.services || [];
  const connections = spec.connections || [];

  // Requirement 14.6: Reject architectures with more than 50 resource nodes
  if (services.length > MAX_RESOURCES) {
    return jsonResponse(400, {
      error: `Architecture has ${services.length} resources, exceeding the maximum of ${MAX_RESOURCES}. Please simplify the architecture.`,
      code: 'RESOURCE_LIMIT_EXCEEDED',
    });
  }

  // Generate IaC code based on format
  let result: { code: string; warnings: string[] };
  switch (format) {
    case 'terraform':
      result = generateTerraform(services, connections);
      break;
    case 'cdk':
      result = generateCDK(services, connections);
      break;
    case 'cloudformation':
      result = generateCloudFormation(services, connections);
      break;
    default:
      return jsonResponse(400, { error: 'Unsupported format' });
  }

  return jsonResponse(200, {
    code: result.code,
    format,
    warnings: result.warnings,
    resourceCount: services.length,
  });
};
