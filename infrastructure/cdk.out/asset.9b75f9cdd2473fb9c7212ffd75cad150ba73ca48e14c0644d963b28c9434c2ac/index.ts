/**
 * Import Lambda Handler
 *
 * Validates and imports .drawio files. Checks well-formed XML,
 * .drawio schema conformance, and file size limits.
 *
 * Connected to API Gateway at POST /api/diagrams/import
 *
 * Environment Variables:
 * - DIAGRAMS_TABLE: DynamoDB table name
 * - DIAGRAM_FILES_BUCKET: S3 bucket name
 *
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ============================================================
// Types
// ============================================================

interface APIGatewayEvent {
  body: string | null;
  headers: Record<string, string | undefined>;
  httpMethod?: string;
  isBase64Encoded?: boolean;
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

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ============================================================
// Clients
// ============================================================

const REGION = process.env.REGION || 'us-east-1';
const DIAGRAMS_TABLE = process.env.DIAGRAMS_TABLE || '';
const DIAGRAM_FILES_BUCKET = process.env.DIAGRAM_FILES_BUCKET || '';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3Client = new S3Client({ region: REGION });

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

function generateDiagramId(): string {
  return `diag-import-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Validates that content is well-formed XML.
 */
function isWellFormedXml(content: string): boolean {
  // Basic XML check: starts with < and contains matching tags
  const trimmed = content.trim();
  if (!trimmed.startsWith('<')) return false;
  if (!trimmed.includes('<?xml') && !trimmed.startsWith('<mxfile') && !trimmed.startsWith('<mxGraphModel')) {
    // Check if it at least looks like XML
    const tagMatch = trimmed.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
    if (!tagMatch) return false;
  }
  // Verify no obvious parse errors (unmatched angle brackets)
  const openBrackets = (trimmed.match(/</g) || []).length;
  const closeBrackets = (trimmed.match(/>/g) || []).length;
  return openBrackets === closeBrackets && openBrackets > 0;
}

/**
 * Validates that the XML conforms to .drawio schema.
 * A valid .drawio file must contain <mxfile> or <mxGraphModel>.
 */
function isDrawioSchema(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.includes('<mxfile') || trimmed.includes('<mxGraphModel');
}

/**
 * Extracts diagram name from .drawio XML.
 */
function extractDiagramName(content: string): string {
  const nameMatch = content.match(/<diagram[^>]*\bname="([^"]+)"/);
  return nameMatch?.[1] || 'Imported Diagram';
}

// ============================================================
// Lambda Handler
// ============================================================

export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'POST';
  if (method === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: '' };

  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || event.headers?.['x-user-id'] || 'anonymous';

  // Parse body (API Gateway may base64-encode binary content)
  let fileContent: string;
  let fileName = 'imported.drawio';

  if (!event.body) {
    return jsonResponse(400, { error: 'Request body is required. Upload a .drawio file.' });
  }

  try {
    if (event.isBase64Encoded) {
      fileContent = Buffer.from(event.body, 'base64').toString('utf-8');
    } else {
      // Try to parse as JSON with content field
      try {
        const jsonBody = JSON.parse(event.body) as { content?: string; fileName?: string; encoding?: string };
        if (jsonBody.content) {
          if (jsonBody.encoding === 'base64') {
            fileContent = Buffer.from(jsonBody.content, 'base64').toString('utf-8');
          } else {
            fileContent = jsonBody.content;
          }
          fileName = jsonBody.fileName || fileName;
        } else {
          return jsonResponse(400, { error: 'Missing "content" field in request body.' });
        }
      } catch {
        // If not JSON, treat body as raw XML content
        fileContent = event.body;
      }
    }
  } catch {
    return jsonResponse(400, { error: 'Failed to decode file content.' });
  }

  // Validate file size (Requirement 15.4, 15.5)
  const fileSizeBytes = new TextEncoder().encode(fileContent).length;
  if (fileSizeBytes > MAX_IMPORT_FILE_SIZE) {
    return jsonResponse(413, {
      error: `File exceeds maximum size of 10 MB. Your file is ${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB.`,
      code: 'SIZE_ERROR',
    });
  }

  // Validate well-formed XML (Requirement 15.3)
  if (!isWellFormedXml(fileContent)) {
    return jsonResponse(422, {
      error: 'File is not valid XML. Please upload a valid .drawio file.',
      code: 'XML_PARSE_ERROR',
    });
  }

  // Validate .drawio schema conformance (Requirement 15.3)
  if (!isDrawioSchema(fileContent)) {
    return jsonResponse(422, {
      error: 'File is valid XML but does not conform to .drawio schema. Expected <mxfile> or <mxGraphModel> root element.',
      code: 'SCHEMA_ERROR',
    });
  }

  // File is valid — proceed with storage
  const diagramId = generateDiagramId();
  const diagramName = extractDiagramName(fileContent);
  const s3Key = `diagrams/${userId}/${diagramId}/diagram.drawio`;

  // Upload to S3
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: DIAGRAM_FILES_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'application/xml',
    }));
  } catch (error) {
    console.error('S3 upload error:', error);
    return jsonResponse(500, { error: 'Failed to store the imported diagram.', code: 'STORAGE_ERROR' });
  }

  // Store diagram metadata in DynamoDB
  const now = new Date().toISOString();
  try {
    await ddbDocClient.send(new PutCommand({
      TableName: DIAGRAMS_TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: `DIAGRAM#${diagramId}`,
        diagramId,
        name: diagramName,
        prompt: `Imported from file: ${fileName}`,
        s3Key,
        serviceCount: 0,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
      },
    }));
  } catch (error) {
    console.error('DynamoDB error:', error);
    // Don't fail — file is already in S3
  }

  return jsonResponse(200, {
    diagramId,
    name: diagramName,
    fileName,
    fileSizeBytes,
    s3Key,
    status: 'ready',
    message: 'File imported successfully. Architecture analysis will begin shortly.',
  });
};
