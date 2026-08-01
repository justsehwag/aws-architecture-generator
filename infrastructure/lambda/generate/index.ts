/**
 * Generate Lambda Handler
 *
 * Processes natural language prompts via Amazon Bedrock (Claude) and produces
 * validated ArchitectureSpec JSON. Connected to API Gateway with Cognito authorizer.
 *
 * Environment Variables:
 * - BEDROCK_MODEL_ID: Bedrock model ID (default: us.anthropic.claude-sonnet-4-5-20250929-v1:0)
 * - BEDROCK_REGION: AWS region for Bedrock (default: us-east-1)
 * - DIAGRAMS_TABLE: DynamoDB table name for diagram metadata
 * - DIAGRAM_FILES_BUCKET: S3 bucket name for diagram files
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.6
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// ============================================================
// Types
// ============================================================

interface APIGatewayEvent {
  body: string | null;
  headers: Record<string, string | undefined>;
  requestContext: {
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
          email?: string;
        };
      };
    };
  };
  pathParameters?: Record<string, string>;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface GenerateRequest {
  prompt: string;
  templateId?: string;
  preferences?: {
    region?: string;
    layoutOrientation?: 'horizontal' | 'vertical';
    includeAnalysis?: boolean;
    includeCostEstimate?: boolean;
  };
}

// ============================================================
// Constants
// ============================================================

const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';
const DIAGRAMS_TABLE = process.env.DIAGRAMS_TABLE || '';
const TIMEOUT_MS = 29_000; // Lambda has 29s timeout
const MAX_RETRIES = 2;
const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 5000;

// ============================================================
// System Prompt
// ============================================================

const ARCHITECTURE_SYSTEM_PROMPT = `You are an AWS Solutions Architect assistant. Given a natural language description of an AWS architecture, produce a JSON object conforming to the ArchitectureSpec schema below.

## Output Schema

{
  "id": "string (UUID)",
  "name": "string (short descriptive name for the architecture)",
  "description": "string (1-2 sentence summary)",
  "region": "string (AWS region, e.g. us-east-1)",
  "services": [
    {
      "id": "string (unique node ID, e.g. svc-1)",
      "type": "string (AWS service type from supported list)",
      "label": "string (display label for the node)",
      "properties": { "key": "value" },
      "groupId": "string (optional, references a group ID)"
    }
  ],
  "connections": [
    {
      "id": "string (unique connection ID, e.g. conn-1)",
      "sourceId": "string (references a service ID)",
      "targetId": "string (references a service ID)",
      "label": "string (optional, describes the connection)",
      "protocol": "string (optional, e.g. HTTPS, TCP, gRPC)",
      "port": "number (optional)",
      "bidirectional": "boolean (optional, default false)"
    }
  ],
  "groups": [
    {
      "id": "string (unique group ID, e.g. grp-1)",
      "type": "region | vpc | subnet | availability-zone | security-group",
      "label": "string (display label)",
      "parentId": "string (optional, for nesting groups)",
      "children": ["string (service IDs belonging to this group)"]
    }
  ],
  "metadata": {
    "prompt": "string (the original user prompt)",
    "generatedAt": "string (ISO 8601 timestamp)",
    "llmModel": "string (model identifier)"
  }
}

## Supported AWS Service Types

ec2, lambda, ecs, eks, fargate, elastic-beanstalk, lightsail, batch, outposts, app-runner, ecr, s3, ebs, efs, fsx, storage-gateway, backup, rds, aurora, dynamodb, elasticache, redshift, neptune, documentdb, keyspaces, timestream, memorydb, vpc, cloudfront, route53, api-gateway, elb, alb, nlb, direct-connect, transit-gateway, global-accelerator, nat-gateway, elastic-ip, iam, cognito, waf, shield, kms, secrets-manager, certificate-manager, guardduty, inspector, macie, sqs, sns, eventbridge, step-functions, appsync, mq, kinesis, athena, emr, glue, quicksight, opensearch, msk, data-pipeline, sagemaker, bedrock, rekognition, comprehend, lex, polly, textract, translate, cloudwatch, cloudtrail, config, systems-manager, cloudformation, organizations, trusted-advisor, codecommit, codebuild, codedeploy, codepipeline, dms, datasync, transfer-family, iot-core, iot-greengrass, mediaconvert, elemental

## Rules

1. Use ONLY service types from the supported list above. If a described service does not match any supported type, use "generic" as the type.
2. Group resources by VPC, subnet, and Availability Zone when the user specifies network topology.
3. Include all necessary connections with protocols when inferable from context.
4. Assign meaningful labels to all services and connections.
5. Generate unique IDs for all services, connections, and groups (use prefixes: svc-, conn-, grp-).
6. Respond ONLY with valid JSON. No markdown fences, no explanation text, no comments.
7. The "metadata.prompt" field must contain the exact user prompt.
8. The "metadata.generatedAt" field must be a valid ISO 8601 timestamp.
9. Every service referenced in a connection (sourceId/targetId) must exist in the services array.
10. Every service referenced in a group's children array must exist in the services array.`;

// ============================================================
// Clients (initialized outside handler for Lambda warm starts)
// ============================================================

const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.REGION || 'us-east-1' })
);

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

function errorResponse(statusCode: number, error: string, extra?: Record<string, unknown>): LambdaResponse {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({ error, ...extra }),
  };
}

function generateDiagramId(): string {
  return `diag-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Calls Amazon Bedrock with retry logic on timeout/throttle.
 * Up to 2 retries (3 total attempts) with exponential backoff.
 */
async function callBedrockWithRetry(prompt: string, model: string): Promise<{ content: string; model: string }> {
  const messages = [
    {
      role: 'user',
      content: `Generate an AWS architecture specification for the following description:\n\n${prompt}\n\nRemember: respond ONLY with valid JSON conforming to the ArchitectureSpec schema. Set metadata.llmModel to "${model}" and metadata.generatedAt to the current ISO timestamp.`,
    },
  ];

  const requestBody = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    temperature: 0.3,
    system: ARCHITECTURE_SYSTEM_PROMPT,
    messages,
  });

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(requestBody),
      });

      // Race against timeout
      const response = await Promise.race([
        bedrockClient.send(command),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS - 2000) // Leave 2s buffer for response processing
        ),
      ]);

      const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'));
      const content = responseBody.content?.[0]?.text;

      if (!content) {
        throw new Error('Bedrock returned empty response');
      }

      return { content, model };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Only retry on timeout or throttling
      const isRetryable =
        err.message === 'TIMEOUT' ||
        err.name === 'ThrottlingException' ||
        err.name === 'ServiceUnavailableException' ||
        err.name === 'ModelTimeoutException';

      if (!isRetryable || attempt === MAX_RETRIES + 1) {
        throw err;
      }

      // Exponential backoff: 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError || new Error('All Bedrock attempts failed');
}

/**
 * Validates the LLM response as a valid ArchitectureSpec.
 * Returns the parsed spec or an array of error messages.
 */
function validateArchitectureSpec(rawResponse: string): { success: true; data: unknown } | { success: false; errors: string[] } {
  let parsed: unknown;
  try {
    // Strip markdown code fences if present
    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      success: false,
      errors: ['Response is not valid JSON. The AI did not produce parseable output.'],
    };
  }

  // Basic structural validation
  const spec = parsed as Record<string, unknown>;
  const errors: string[] = [];

  if (!spec.id || typeof spec.id !== 'string') errors.push('Missing or invalid "id" field');
  if (!spec.name || typeof spec.name !== 'string') errors.push('Missing or invalid "name" field');
  if (!spec.description || typeof spec.description !== 'string') errors.push('Missing or invalid "description" field');
  if (!spec.region || typeof spec.region !== 'string') errors.push('Missing or invalid "region" field');
  if (!Array.isArray(spec.services) || spec.services.length === 0) errors.push('Missing or empty "services" array');
  if (!Array.isArray(spec.connections)) errors.push('Missing "connections" array');
  if (!Array.isArray(spec.groups)) errors.push('Missing "groups" array');
  if (!spec.metadata || typeof spec.metadata !== 'object') errors.push('Missing "metadata" object');

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Validate service references in connections
  const serviceIds = new Set((spec.services as Array<{ id: string }>).map((s) => s.id));
  for (const conn of spec.connections as Array<{ sourceId: string; targetId: string; id: string }>) {
    if (!serviceIds.has(conn.sourceId)) {
      errors.push(`Connection "${conn.id}" references unknown source "${conn.sourceId}"`);
    }
    if (!serviceIds.has(conn.targetId)) {
      errors.push(`Connection "${conn.id}" references unknown target "${conn.targetId}"`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: parsed };
}

/**
 * Generates alternative prompt phrasings when the LLM fails to interpret.
 */
function generateAlternativePhrasings(originalPrompt: string): string[] {
  return [
    `Try specifying AWS services explicitly, e.g.: "${originalPrompt.slice(0, 50)}... using Lambda, API Gateway, and DynamoDB"`,
    `Try describing the data flow, e.g.: "Users connect to... which sends data to... which stores in..."`,
    `Try starting with a known pattern, e.g.: "A serverless API with ${originalPrompt.slice(0, 30)}..."`,
  ];
}

/**
 * Stores diagram metadata in DynamoDB.
 */
async function storeDiagramMetadata(
  userId: string,
  diagramId: string,
  name: string,
  prompt: string,
  architectureSpec: unknown,
  serviceCount: number,
  templateId?: string
): Promise<void> {
  if (!DIAGRAMS_TABLE) return;

  const now = new Date().toISOString();
  await ddbDocClient.send(
    new PutCommand({
      TableName: DIAGRAMS_TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: `DIAGRAM#${diagramId}`,
        diagramId,
        name,
        prompt,
        architectureSpec: JSON.stringify(architectureSpec),
        s3Key: `diagrams/${userId}/${diagramId}/diagram.drawio`,
        templateId: templateId || null,
        serviceCount,
        status: 'generating',
        createdAt: now,
        updatedAt: now,
      },
    })
  );
}

// ============================================================
// Lambda Handler
// ============================================================

export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  // Handle CORS preflight
  if ((event as unknown as { httpMethod?: string }).httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  // Extract user ID from Cognito JWT claims
  const userId =
    event.requestContext?.authorizer?.jwt?.claims?.sub ||
    event.headers?.['x-user-id'] ||
    'anonymous';

  // Parse request body
  if (!event.body) {
    return errorResponse(400, 'Request body is required');
  }

  let body: GenerateRequest;
  try {
    body = JSON.parse(event.body);
  } catch {
    return errorResponse(400, 'Invalid JSON in request body');
  }

  // Validate prompt
  const { prompt, templateId, preferences } = body;

  if (!prompt || typeof prompt !== 'string') {
    return errorResponse(400, 'Prompt is required and must be a string');
  }

  if (prompt.length < MIN_PROMPT_LENGTH) {
    return errorResponse(400, `Prompt must be at least ${MIN_PROMPT_LENGTH} characters`, {
      details: [`Prompt must be at least ${MIN_PROMPT_LENGTH} characters`],
    });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return errorResponse(400, `Prompt must not exceed ${MAX_PROMPT_LENGTH} characters`, {
      details: [`Prompt must not exceed ${MAX_PROMPT_LENGTH} characters`],
    });
  }

  // Call Bedrock
  let llmContent: string;
  let llmModel: string;

  try {
    const result = await callBedrockWithRetry(prompt, BEDROCK_MODEL_ID);
    llmContent = result.content;
    llmModel = result.model;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));

    if (err.message === 'TIMEOUT') {
      return errorResponse(504, 'The architecture generation request timed out. Please try again.', {
        code: 'TIMEOUT',
      });
    }

    if (err.name === 'AccessDeniedException') {
      return errorResponse(503, 'Bedrock model access is not configured. Ensure the model is enabled in your AWS account.', {
        code: 'MODEL_ACCESS_DENIED',
      });
    }

    return errorResponse(502, `AI service error: ${err.message}`, {
      code: 'LLM_ERROR',
    });
  }

  // Validate the LLM response
  const validation = validateArchitectureSpec(llmContent);

  if (!validation.success) {
    return errorResponse(422, 'The AI could not produce a valid architecture specification. Please try rephrasing your description.', {
      code: 'PARSE_FAILURE',
      details: validation.errors,
      suggestions: generateAlternativePhrasings(prompt),
    });
  }

  const architectureSpec = validation.data as Record<string, unknown>;
  const diagramId = generateDiagramId();
  const serviceCount = (architectureSpec.services as unknown[]).length;

  // Store in DynamoDB (non-blocking, don't fail the request if this errors)
  try {
    await storeDiagramMetadata(
      userId,
      diagramId,
      architectureSpec.name as string,
      prompt,
      architectureSpec,
      serviceCount,
      templateId
    );
  } catch (dbError) {
    console.error('Failed to store diagram metadata:', dbError);
  }

  // Return successful response
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      diagramId,
      architectureSpec,
      status: 'generating',
      serviceCount,
      model: llmModel,
      region: preferences?.region || architectureSpec.region,
    }),
  };
};
