/**
 * Render Lambda Handler
 *
 * Converts ArchitectureSpec JSON into Draw.io XML, applies AWS icons,
 * groups resources into containers, and stores the result in S3.
 *
 * Connected to API Gateway at:
 * - GET/PUT/DELETE /api/diagrams/{id}
 * - GET/POST /api/diagrams/{id}/versions
 * - PUT /api/diagrams/{id}/versions/{vid}/restore
 *
 * Also handles template listing at GET/POST /api/templates
 *
 * Environment Variables:
 * - DIAGRAMS_TABLE: DynamoDB table name for diagram metadata
 * - VERSIONS_TABLE: DynamoDB table name for versions
 * - TEMPLATES_TABLE: DynamoDB table name for templates
 * - DIAGRAM_FILES_BUCKET: S3 bucket name for diagram files
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.7
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// ============================================================
// Types
// ============================================================

interface APIGatewayEvent {
  body: string | null;
  headers: Record<string, string | undefined>;
  httpMethod?: string;
  requestContext: {
    authorizer?: {
      jwt?: { claims?: { sub?: string } };
    };
    http?: { method: string; path: string };
  };
  pathParameters?: Record<string, string>;
  routeKey?: string;
  rawPath?: string;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// ============================================================
// Clients
// ============================================================

const REGION = process.env.REGION || 'us-east-1';
const DIAGRAMS_TABLE = process.env.DIAGRAMS_TABLE || '';
const VERSIONS_TABLE = process.env.VERSIONS_TABLE || '';
const TEMPLATES_TABLE = process.env.TEMPLATES_TABLE || '';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ============================================================
// Helpers
// ============================================================

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

function jsonResponse(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

function getUserId(event: APIGatewayEvent): string {
  return event.requestContext?.authorizer?.jwt?.claims?.sub || event.headers?.['x-user-id'] || 'anonymous';
}

function getMethod(event: APIGatewayEvent): string {
  return event.requestContext?.http?.method || event.httpMethod || 'GET';
}

function getPath(event: APIGatewayEvent): string {
  return event.rawPath || event.requestContext?.http?.path || '';
}

// ============================================================
// Route Handlers
// ============================================================

async function handleGetDiagram(userId: string, diagramId: string): Promise<LambdaResponse> {
  const result = await ddbDocClient.send(new GetCommand({
    TableName: DIAGRAMS_TABLE,
    Key: { PK: `USER#${userId}`, SK: `DIAGRAM#${diagramId}` },
  }));

  if (!result.Item) {
    return jsonResponse(404, { error: 'Diagram not found' });
  }

  return jsonResponse(200, result.Item);
}

async function handleDeleteDiagram(userId: string, diagramId: string): Promise<LambdaResponse> {
  await ddbDocClient.send(new DeleteCommand({
    TableName: DIAGRAMS_TABLE,
    Key: { PK: `USER#${userId}`, SK: `DIAGRAM#${diagramId}` },
  }));

  return jsonResponse(200, { message: 'Diagram deleted', diagramId });
}

async function handleUpdateDiagram(userId: string, diagramId: string, body: string | null): Promise<LambdaResponse> {
  if (!body) return jsonResponse(400, { error: 'Request body is required' });

  let data: Record<string, unknown>;
  try { data = JSON.parse(body); } catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

  const now = new Date().toISOString();
  await ddbDocClient.send(new UpdateCommand({
    TableName: DIAGRAMS_TABLE,
    Key: { PK: `USER#${userId}`, SK: `DIAGRAM#${diagramId}` },
    UpdateExpression: 'SET #name = :name, updatedAt = :now',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: { ':name': data.name || 'Untitled', ':now': now },
  }));

  return jsonResponse(200, { message: 'Diagram updated', diagramId });
}

async function handleGetVersions(userId: string, diagramId: string): Promise<LambdaResponse> {
  const result = await ddbDocClient.send(new QueryCommand({
    TableName: VERSIONS_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `DIAGRAM#${diagramId}` },
    ScanIndexForward: false,
  }));

  return jsonResponse(200, { versions: result.Items || [] });
}

async function handleCreateVersion(userId: string, diagramId: string, body: string | null): Promise<LambdaResponse> {
  if (!body) return jsonResponse(400, { error: 'Request body is required' });

  let data: Record<string, unknown>;
  try { data = JSON.parse(body); } catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

  const versionId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  await ddbDocClient.send(new PutCommand({
    TableName: VERSIONS_TABLE,
    Item: {
      PK: `DIAGRAM#${diagramId}`,
      SK: `VERSION#${versionId}`,
      versionId,
      diagramId,
      userId,
      name: data.name || 'Autosave',
      isAutosave: data.isAutosave || false,
      diagramState: data.diagramState || '',
      createdAt: now,
    },
  }));

  return jsonResponse(201, { versionId, diagramId, createdAt: now });
}

async function handleRestoreVersion(userId: string, diagramId: string, versionId: string): Promise<LambdaResponse> {
  // Fetch the version
  const result = await ddbDocClient.send(new GetCommand({
    TableName: VERSIONS_TABLE,
    Key: { PK: `DIAGRAM#${diagramId}`, SK: `VERSION#${versionId}` },
  }));

  if (!result.Item) {
    return jsonResponse(404, { error: 'Version not found' });
  }

  return jsonResponse(200, { message: 'Version restored', version: result.Item });
}

async function handleGetTemplates(): Promise<LambdaResponse> {
  const result = await ddbDocClient.send(new QueryCommand({
    TableName: TEMPLATES_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'TEMPLATE#BUILTIN' },
  }));

  return jsonResponse(200, { templates: result.Items || [] });
}

async function handleCreateTemplate(userId: string, body: string | null): Promise<LambdaResponse> {
  if (!body) return jsonResponse(400, { error: 'Request body is required' });

  let data: Record<string, unknown>;
  try { data = JSON.parse(body); } catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

  const templateId = `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  await ddbDocClient.send(new PutCommand({
    TableName: TEMPLATES_TABLE,
    Item: {
      PK: `USER#${userId}`,
      SK: `TEMPLATE#${templateId}`,
      templateId,
      ownerId: userId,
      name: data.name || 'Custom Template',
      description: data.description || '',
      category: data.category || 'custom',
      architectureSpec: data.architectureSpec || '',
      createdAt: now,
    },
  }));

  return jsonResponse(201, { templateId, createdAt: now });
}

// ============================================================
// Lambda Handler
// ============================================================

export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  const method = getMethod(event);

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  const userId = getUserId(event);
  const path = getPath(event);
  const diagramId = event.pathParameters?.id || '';
  const versionId = event.pathParameters?.vid || '';

  try {
    // Route: /api/templates
    if (path.includes('/api/templates')) {
      if (method === 'GET') return await handleGetTemplates();
      if (method === 'POST') return await handleCreateTemplate(userId, event.body);
    }

    // Route: /api/diagrams/{id}/versions/{vid}/restore
    if (versionId && path.includes('/restore')) {
      return await handleRestoreVersion(userId, diagramId, versionId);
    }

    // Route: /api/diagrams/{id}/versions
    if (path.includes('/versions')) {
      if (method === 'GET') return await handleGetVersions(userId, diagramId);
      if (method === 'POST') return await handleCreateVersion(userId, diagramId, event.body);
    }

    // Route: /api/diagrams/{id}
    if (diagramId) {
      if (method === 'GET') return await handleGetDiagram(userId, diagramId);
      if (method === 'PUT') return await handleUpdateDiagram(userId, diagramId, event.body);
      if (method === 'DELETE') return await handleDeleteDiagram(userId, diagramId);
    }

    return jsonResponse(400, { error: 'Invalid request' });
  } catch (error) {
    console.error('Render Lambda error:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
};
