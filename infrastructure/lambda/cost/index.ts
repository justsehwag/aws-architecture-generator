/**
 * Cost Lambda Handler
 *
 * Calculates estimated monthly costs for architecture services.
 * Uses default assumptions (730 hrs, 1M requests, 100GB transfer, 50GB storage).
 * Provides per-service breakdown in USD (2 decimal places).
 *
 * Connected to API Gateway at:
 * - GET /api/diagrams/{id}/cost
 * - PUT /api/diagrams/{id}/cost
 *
 * Environment Variables:
 * - DIAGRAMS_TABLE: DynamoDB table name
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5, 7.6
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

interface UsageAssumptions {
  computeHoursPerMonth: number;
  requestsPerMonth: number;
  dataTransferGB: number;
  storageGB: number;
}

interface ServiceCost {
  serviceId: string;
  serviceType: string;
  label: string;
  monthlyCost: number;
  available: boolean;
  breakdown?: string;
}

// ============================================================
// Constants
// ============================================================

const REGION = process.env.REGION || 'us-east-1';
const DIAGRAMS_TABLE = process.env.DIAGRAMS_TABLE || '';

const DEFAULT_ASSUMPTIONS: UsageAssumptions = {
  computeHoursPerMonth: 730,
  requestsPerMonth: 1_000_000,
  dataTransferGB: 100,
  storageGB: 50,
};

// Simplified pricing data (USD/month estimates)
const SERVICE_PRICING: Record<string, (a: UsageAssumptions) => number> = {
  ec2: (a) => a.computeHoursPerMonth * 0.0464, // t3.medium on-demand
  lambda: (a) => (a.requestsPerMonth / 1_000_000) * 0.20 + (a.requestsPerMonth * 0.2 / 1000) * 0.0000166667,
  'api-gateway': (a) => (a.requestsPerMonth / 1_000_000) * 3.50,
  s3: (a) => a.storageGB * 0.023 + (a.requestsPerMonth / 1000) * 0.0004,
  dynamodb: (a) => (a.requestsPerMonth / 1_000_000) * 1.25 + a.storageGB * 0.25,
  rds: (a) => a.computeHoursPerMonth * 0.096 + a.storageGB * 0.115,
  aurora: (a) => a.computeHoursPerMonth * 0.10 + a.storageGB * 0.10,
  cloudfront: (a) => a.dataTransferGB * 0.085,
  alb: () => 16.20 + 0.008 * 730,
  nlb: () => 16.20 + 0.006 * 730,
  ecs: (a) => a.computeHoursPerMonth * 0.04048,
  fargate: (a) => a.computeHoursPerMonth * 0.04048 + a.computeHoursPerMonth * 0.004445 * 2,
  sqs: (a) => (a.requestsPerMonth / 1_000_000) * 0.40,
  sns: (a) => (a.requestsPerMonth / 1_000_000) * 0.50,
  elasticache: (a) => a.computeHoursPerMonth * 0.068,
  redshift: (a) => a.computeHoursPerMonth * 0.25,
  kinesis: (a) => 0.015 * 730 + (a.requestsPerMonth / 1_000_000) * 0.014,
  cognito: (a) => Math.max(0, (a.requestsPerMonth / 50000 - 50000)) * 0.0055,
  'nat-gateway': (a) => 0.045 * 730 + a.dataTransferGB * 0.045,
  route53: () => 0.50,
  kms: () => 1.00,
  cloudwatch: () => 10.00,
  waf: (a) => 5.00 + (a.requestsPerMonth / 1_000_000) * 0.60,
  'step-functions': (a) => (a.requestsPerMonth / 1000) * 0.025,
  sagemaker: (a) => a.computeHoursPerMonth * 0.269,
  bedrock: (a) => (a.requestsPerMonth * 1000 / 1_000_000) * 0.003 + (a.requestsPerMonth * 300 / 1_000_000) * 0.015,
  eks: (a) => 0.10 * 730,
  opensearch: (a) => a.computeHoursPerMonth * 0.096 + a.storageGB * 0.135,
  glue: (a) => a.computeHoursPerMonth * 0.44,
  vpc: () => 0,
  iam: () => 0,
};

// ============================================================
// Clients
// ============================================================

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ============================================================
// Helpers
// ============================================================

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  };
}

function jsonResponse(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function calculateCosts(services: Array<{ id: string; type: string; label: string }>, assumptions: UsageAssumptions) {
  const serviceCosts: ServiceCost[] = services.map((svc) => {
    const pricingFn = SERVICE_PRICING[svc.type];
    if (!pricingFn) {
      return { serviceId: svc.id, serviceType: svc.type, label: svc.label, monthlyCost: 0, available: false };
    }
    const cost = Math.round(pricingFn(assumptions) * 100) / 100;
    return { serviceId: svc.id, serviceType: svc.type, label: svc.label, monthlyCost: cost, available: true };
  });

  const totalMonthlyCost = Math.round(
    serviceCosts.filter((s) => s.available).reduce((sum, s) => sum + s.monthlyCost, 0) * 100
  ) / 100;

  return { totalMonthlyCost, services: serviceCosts, assumptions };
}

function validateAssumptions(a: unknown): string | null {
  if (typeof a !== 'object' || a === null) return 'Usage assumptions must be an object.';
  const obj = a as Record<string, unknown>;
  if (obj.computeHoursPerMonth !== undefined && (typeof obj.computeHoursPerMonth !== 'number' || obj.computeHoursPerMonth < 0 || obj.computeHoursPerMonth > 8760)) return 'computeHoursPerMonth must be 0-8760.';
  if (obj.requestsPerMonth !== undefined && (typeof obj.requestsPerMonth !== 'number' || obj.requestsPerMonth < 1 || obj.requestsPerMonth > 10_000_000_000)) return 'requestsPerMonth must be 1-10B.';
  if (obj.dataTransferGB !== undefined && (typeof obj.dataTransferGB !== 'number' || obj.dataTransferGB < 0 || obj.dataTransferGB > 102_400)) return 'dataTransferGB must be 0-102400.';
  if (obj.storageGB !== undefined && (typeof obj.storageGB !== 'number' || obj.storageGB < 0 || obj.storageGB > 1_073_741_824)) return 'storageGB must be 0-1PB.';
  return null;
}

// ============================================================
// Lambda Handler
// ============================================================

export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || event.headers?.['x-user-id'] || 'anonymous';
  const diagramId = event.pathParameters?.id;

  if (!diagramId) return jsonResponse(400, { error: 'Diagram ID is required' });

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
  let spec: { services?: Array<{ id: string; type: string; label: string }> };
  try {
    spec = typeof diagramRecord.architectureSpec === 'string'
      ? JSON.parse(diagramRecord.architectureSpec)
      : diagramRecord.architectureSpec;
  } catch {
    return jsonResponse(500, { error: 'Failed to parse architecture specification.', code: 'PARSE_ERROR' });
  }

  const services = spec?.services || [];

  // Empty architecture returns $0
  if (services.length === 0) {
    return jsonResponse(200, { totalMonthlyCost: 0, services: [], assumptions: DEFAULT_ASSUMPTIONS });
  }

  if (method === 'GET') {
    return jsonResponse(200, calculateCosts(services, DEFAULT_ASSUMPTIONS));
  }

  // PUT: recalculate with custom assumptions
  if (method === 'PUT') {
    if (!event.body) return jsonResponse(400, { error: 'Request body is required' });
    let body: Record<string, unknown>;
    try { body = JSON.parse(event.body); } catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

    const validationError = validateAssumptions(body.assumptions);
    if (validationError) return jsonResponse(400, { error: validationError, code: 'INVALID_ASSUMPTIONS' });

    const merged: UsageAssumptions = {
      computeHoursPerMonth: (body.assumptions as Record<string, number>)?.computeHoursPerMonth ?? DEFAULT_ASSUMPTIONS.computeHoursPerMonth,
      requestsPerMonth: (body.assumptions as Record<string, number>)?.requestsPerMonth ?? DEFAULT_ASSUMPTIONS.requestsPerMonth,
      dataTransferGB: (body.assumptions as Record<string, number>)?.dataTransferGB ?? DEFAULT_ASSUMPTIONS.dataTransferGB,
      storageGB: (body.assumptions as Record<string, number>)?.storageGB ?? DEFAULT_ASSUMPTIONS.storageGB,
    };

    return jsonResponse(200, calculateCosts(services, merged));
  }

  return jsonResponse(400, { error: 'Unsupported method' });
};
