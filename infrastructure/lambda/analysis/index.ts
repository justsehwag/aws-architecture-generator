/**
 * Analysis Lambda Handler
 *
 * Evaluates architectures against the AWS Well-Architected Framework.
 * Detects missing components, generates categorized recommendations,
 * and assigns severity levels.
 *
 * Connected to API Gateway at GET /api/diagrams/{id}/analysis
 *
 * Environment Variables:
 * - DIAGRAMS_TABLE: DynamoDB table name for diagram metadata
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
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

type Severity = 'Critical' | 'Recommended' | 'Optional';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  pillar: string;
  affectedServices: string[];
}

interface PillarAssessment {
  pillar: string;
  score: number;
  maxScore: number;
  findings: string[];
}

interface ArchitectureAnalysis {
  diagramId: string;
  wellArchitectedAssessment: PillarAssessment[];
  recommendations: Recommendation[];
  missingComponents: string[];
  overallScore: number;
}

// Well-Architected Framework Pillars
const WA_PILLARS = [
  'Operational Excellence',
  'Security',
  'Reliability',
  'Performance Efficiency',
  'Cost Optimization',
  'Sustainability',
];

// Service type to category mapping for analysis
const SECURITY_SERVICES = ['iam', 'cognito', 'waf', 'shield', 'kms', 'secrets-manager', 'certificate-manager', 'guardduty', 'inspector', 'macie'];
const HA_SERVICES = ['alb', 'nlb', 'elb', 'route53', 'cloudfront', 'global-accelerator', 'auto-scaling'];
const MONITORING_SERVICES = ['cloudwatch', 'cloudtrail', 'config', 'systems-manager'];
const BACKUP_SERVICES = ['backup', 's3', 'ebs'];

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

function jsonResponse(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

/**
 * Detects missing components from a reference architecture checklist.
 */
function detectMissingComponents(serviceTypes: string[]): string[] {
  const missing: string[] = [];
  const serviceSet = new Set(serviceTypes);

  if (!serviceSet.has('cloudwatch') && !serviceSet.has('cloudtrail')) {
    missing.push('No monitoring/logging service detected (CloudWatch, CloudTrail)');
  }
  if (!SECURITY_SERVICES.some((s) => serviceSet.has(s))) {
    missing.push('No security services detected (IAM, WAF, KMS, etc.)');
  }
  if (!serviceSet.has('backup') && !serviceSet.has('s3')) {
    missing.push('No backup/disaster recovery strategy detected');
  }
  if (!HA_SERVICES.some((s) => serviceSet.has(s))) {
    missing.push('No high-availability components detected (Load Balancer, Route 53, etc.)');
  }
  if (!serviceSet.has('vpc') && !serviceSet.has('nat-gateway')) {
    missing.push('No network isolation detected (VPC, NAT Gateway)');
  }

  return missing;
}

/**
 * Evaluates architecture against each Well-Architected pillar.
 */
function evaluateWellArchitected(serviceTypes: string[]): PillarAssessment[] {
  const serviceSet = new Set(serviceTypes);

  return WA_PILLARS.map((pillar) => {
    const findings: string[] = [];
    let score = 0;
    const maxScore = 10;

    switch (pillar) {
      case 'Security': {
        const secCount = SECURITY_SERVICES.filter((s) => serviceSet.has(s)).length;
        score = Math.min(10, secCount * 2 + 2);
        if (!serviceSet.has('iam')) findings.push('No IAM configuration detected');
        if (!serviceSet.has('kms')) findings.push('No encryption service (KMS) detected');
        if (!serviceSet.has('waf') && !serviceSet.has('shield')) findings.push('No perimeter protection (WAF/Shield)');
        break;
      }
      case 'Reliability': {
        const haCount = HA_SERVICES.filter((s) => serviceSet.has(s)).length;
        score = Math.min(10, haCount * 3 + 2);
        if (!serviceSet.has('alb') && !serviceSet.has('nlb')) findings.push('No load balancer detected');
        if (!serviceSet.has('route53')) findings.push('No DNS/failover routing detected');
        break;
      }
      case 'Performance Efficiency': {
        score = Math.min(10, serviceTypes.length >= 3 ? 6 : 3);
        if (serviceSet.has('cloudfront')) score += 2;
        if (serviceSet.has('elasticache')) score += 2;
        if (!serviceSet.has('cloudfront')) findings.push('Consider CDN (CloudFront) for edge caching');
        break;
      }
      case 'Cost Optimization': {
        score = 5;
        if (serviceSet.has('lambda') || serviceSet.has('fargate')) score += 3;
        if (serviceTypes.length > 20) findings.push('Large number of services — review for consolidation opportunities');
        break;
      }
      case 'Operational Excellence': {
        const monCount = MONITORING_SERVICES.filter((s) => serviceSet.has(s)).length;
        score = Math.min(10, monCount * 3 + 2);
        if (!serviceSet.has('cloudwatch')) findings.push('No monitoring (CloudWatch) detected');
        if (!serviceSet.has('cloudtrail')) findings.push('No audit trail (CloudTrail) detected');
        break;
      }
      case 'Sustainability': {
        score = 5;
        if (serviceSet.has('lambda') || serviceSet.has('fargate')) score += 3;
        if (serviceSet.has('graviton') || serviceTypes.some((t) => t.includes('graviton'))) score += 2;
        break;
      }
    }

    return { pillar, score: Math.min(score, maxScore), maxScore, findings };
  });
}

/**
 * Generates categorized recommendations based on architecture analysis.
 */
function generateRecommendations(serviceTypes: string[], missingComponents: string[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const serviceSet = new Set(serviceTypes);
  let idCounter = 1;

  // Security recommendations
  if (!serviceSet.has('waf')) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: 'Add AWS WAF for web application protection',
      description: 'Protect your application from common web exploits by deploying AWS WAF in front of your API Gateway or ALB.',
      severity: 'Critical',
      category: 'security',
      pillar: 'Security',
      affectedServices: ['api-gateway', 'alb', 'cloudfront'],
    });
  }

  if (!serviceSet.has('kms')) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: 'Enable encryption at rest with KMS',
      description: 'Use AWS KMS to manage encryption keys for data at rest in S3, DynamoDB, and RDS.',
      severity: 'Critical',
      category: 'security',
      pillar: 'Security',
      affectedServices: ['s3', 'dynamodb', 'rds'],
    });
  }

  // High Availability recommendations
  if (!serviceSet.has('alb') && !serviceSet.has('nlb') && serviceSet.has('ec2')) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: 'Add a Load Balancer for high availability',
      description: 'Deploy an Application Load Balancer to distribute traffic across multiple EC2 instances or containers.',
      severity: 'Critical',
      category: 'high-availability',
      pillar: 'Reliability',
      affectedServices: ['ec2', 'ecs', 'fargate'],
    });
  }

  if (!serviceSet.has('route53')) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: 'Configure DNS with Route 53',
      description: 'Use Route 53 for DNS management with health checks and failover routing policies.',
      severity: 'Recommended',
      category: 'high-availability',
      pillar: 'Reliability',
      affectedServices: [],
    });
  }

  // Monitoring recommendations
  if (!serviceSet.has('cloudwatch')) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: 'Enable CloudWatch monitoring and alarms',
      description: 'Set up CloudWatch metrics, dashboards, and alarms to monitor application health and performance.',
      severity: 'Critical',
      category: 'monitoring',
      pillar: 'Operational Excellence',
      affectedServices: serviceTypes,
    });
  }

  if (!serviceSet.has('cloudtrail')) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: 'Enable CloudTrail for audit logging',
      description: 'Record all API activity with CloudTrail for security auditing and compliance.',
      severity: 'Recommended',
      category: 'monitoring',
      pillar: 'Operational Excellence',
      affectedServices: [],
    });
  }

  // Cost optimization recommendations
  if (serviceSet.has('ec2') && !serviceSet.has('lambda') && !serviceSet.has('fargate')) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: 'Consider serverless alternatives for cost optimization',
      description: 'Evaluate Lambda or Fargate for workloads with variable traffic to reduce idle compute costs.',
      severity: 'Optional',
      category: 'cost',
      pillar: 'Cost Optimization',
      affectedServices: ['ec2'],
    });
  }

  if (!serviceSet.has('cloudfront') && (serviceSet.has('s3') || serviceSet.has('alb'))) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: 'Add CloudFront for edge caching',
      description: 'Reduce latency and origin load by caching content at edge locations with CloudFront.',
      severity: 'Recommended',
      category: 'performance',
      pillar: 'Performance Efficiency',
      affectedServices: ['s3', 'alb'],
    });
  }

  // Add missing component warnings
  for (const missing of missingComponents) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: `Missing: ${missing}`,
      description: missing,
      severity: 'Recommended',
      category: 'architecture',
      pillar: 'Reliability',
      affectedServices: [],
    });
  }

  // Cap at 10 per category
  return recommendations.slice(0, 30);
}

// ============================================================
// Lambda Handler
// ============================================================

export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || event.headers?.['x-user-id'] || 'anonymous';
  const diagramId = event.pathParameters?.id;

  if (!diagramId) {
    return jsonResponse(400, { error: 'Diagram ID is required' });
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

  if (!diagramRecord) {
    return jsonResponse(404, { error: 'Diagram not found' });
  }

  if (!diagramRecord.architectureSpec) {
    return jsonResponse(400, { error: 'Diagram does not have an architecture specification.', code: 'NO_SPEC' });
  }

  // Parse the architecture spec
  let spec: { services?: Array<{ type: string; id: string; label: string }> };
  try {
    spec = typeof diagramRecord.architectureSpec === 'string'
      ? JSON.parse(diagramRecord.architectureSpec)
      : diagramRecord.architectureSpec;
  } catch {
    return jsonResponse(500, { error: 'Failed to parse architecture specification.', code: 'PARSE_ERROR' });
  }

  const services = spec.services || [];
  const serviceTypes = services.map((s) => s.type);

  // Run analysis
  const missingComponents = detectMissingComponents(serviceTypes);
  const wellArchitectedAssessment = evaluateWellArchitected(serviceTypes);
  const recommendations = generateRecommendations(serviceTypes, missingComponents);

  const overallScore = Math.round(
    wellArchitectedAssessment.reduce((sum, p) => sum + p.score, 0) /
    wellArchitectedAssessment.reduce((sum, p) => sum + p.maxScore, 0) * 100
  );

  const analysis: ArchitectureAnalysis = {
    diagramId,
    wellArchitectedAssessment,
    recommendations,
    missingComponents,
    overallScore,
  };

  return jsonResponse(200, analysis);
};
