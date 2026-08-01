/**
 * POST /api/diagrams/generate
 *
 * Generation Lambda handler (Next.js API route).
 *
 * Accepts a natural language prompt, sends it to the LLM for interpretation,
 * validates the response as a valid ArchitectureSpec, stores metadata in DynamoDB,
 * and returns the generated specification.
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.6
 */

// Max execution time for this route (5 minutes)
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callLLMWithRetry } from '@/lib/llm/client';
import { buildGenerationMessages } from '@/lib/llm/prompts';
import {
  validateArchitectureSpec,
  type ArchitectureValidationResult,
} from '@/lib/llm/schema-validator';
import {
  LLMTimeoutError,
  LLMParseError,
  LLMAPIError,
  getLLMConfig,
} from '@/lib/llm/types';
import { createDiagram } from '@/lib/db/diagrams';
import { generateExplanation } from '@/lib/explanation';

/**
 * Request body schema with validation.
 * Prompt must be 10-5000 characters (Requirement 1.1, 1.7, 1.8).
 */
const generateRequestSchema = z.object({
  prompt: z
    .string()
    .min(10, { message: 'Prompt must be at least 10 characters' })
    .max(5000, { message: 'Prompt must not exceed 5000 characters' }),
  templateId: z.string().optional(),
  preferences: z
    .object({
      region: z.string().optional(),
      layoutOrientation: z.enum(['horizontal', 'vertical']).optional(),
      includeAnalysis: z.boolean().optional(),
      includeCostEstimate: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Generates alternative prompt phrasings when the LLM fails to interpret.
 * Requirement 1.5: suggest up to 3 alternative phrasings.
 */
function generateAlternativePhrasings(originalPrompt: string): string[] {
  const suggestions: string[] = [];

  // Suggest being more specific about services
  suggestions.push(
    `Try specifying AWS services explicitly, e.g.: "${originalPrompt.slice(0, 50)}... using Lambda, API Gateway, and DynamoDB"`
  );

  // Suggest describing the data flow
  suggestions.push(
    `Try describing the data flow, e.g.: "Users connect to... which sends data to... which stores in..."`
  );

  // Suggest starting with a template pattern
  suggestions.push(
    `Try starting with a known pattern, e.g.: "A serverless API with ${originalPrompt.slice(0, 30)}..."`
  );

  return suggestions;
}

/**
 * Generates a unique diagram ID.
 */
function generateDiagramId(): string {
  return `diag-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export async function POST(request: NextRequest) {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const validation = generateRequestSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => issue.message);
    return NextResponse.json(
      { error: 'Validation failed', details: errors },
      { status: 400 }
    );
  }

  const { prompt, templateId, preferences } = validation.data;
  const llmConfig = getLLMConfig();

  // Check if API key is configured (not needed for Bedrock which uses IAM)
  if (!llmConfig.apiKey && llmConfig.provider !== 'bedrock') {
    return NextResponse.json(
      {
        error: 'LLM service is not configured. Please set the API key in environment variables.',
      },
      { status: 503 }
    );
  }

  // Build LLM messages
  const messages = buildGenerationMessages(prompt, llmConfig.model);

  // Call LLM with retry logic (30s timeout, up to 2 retries)
  let llmResponseContent: string;
  let llmModel: string;

  try {
    const llmResponse = await callLLMWithRetry(
      messages.map((m) => ({ ...m, role: m.role as 'system' | 'user' | 'assistant' })),
      llmConfig
    );
    llmResponseContent = llmResponse.content;
    llmModel = llmResponse.model;
  } catch (error) {
    // Requirement 1.6: timeout error after retries exhausted
    if (error instanceof LLMTimeoutError) {
      return NextResponse.json(
        {
          error:
            'The architecture generation request timed out. The AI service is taking longer than expected. Please try again.',
          code: 'TIMEOUT',
        },
        { status: 504 }
      );
    }

    // LLM API errors (rate limit, auth, etc.)
    if (error instanceof LLMAPIError) {
      return NextResponse.json(
        {
          error: `AI service error: ${error.message}`,
          code: 'LLM_ERROR',
        },
        { status: 502 }
      );
    }

    // Unexpected errors
    return NextResponse.json(
      {
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }

  // Validate LLM response against ArchitectureSpec schema (Requirement 1.2, 1.4)
  const specValidation: ArchitectureValidationResult =
    validateArchitectureSpec(llmResponseContent);

  if (!specValidation.success) {
    // Requirement 1.4, 1.5: parse failure → error + suggestions
    return NextResponse.json(
      {
        error:
          'The AI could not produce a valid architecture specification from your prompt. Please try rephrasing your description.',
        code: 'PARSE_FAILURE',
        details: specValidation.errors,
        suggestions: generateAlternativePhrasings(prompt),
      },
      { status: 422 }
    );
  }

  const architectureSpec = specValidation.data;

  // Generate diagram ID and S3 key
  const diagramId = generateDiagramId();
  const userId = request.headers.get('x-user-id') || 'anonymous';
  const s3Key = `diagrams/${userId}/${diagramId}/diagram.drawio`;

  // Store diagram metadata in DynamoDB with 'generating' status
  try {
    await createDiagram(userId, {
      diagramId,
      name: architectureSpec.name,
      prompt,
      architectureSpec: JSON.stringify(architectureSpec),
      s3Key,
      templateId,
      serviceCount: architectureSpec.services.length,
      status: 'generating',
    });
  } catch (dbError) {
    // Log error but don't fail the request — the spec was generated successfully
    console.error('Failed to store diagram metadata:', dbError);
  }

  // Generate plain-language explanation (Requirement 8.1, 8.2, 8.3, 8.4)
  const explanation = generateExplanation(architectureSpec);

  // Return successful response with the generated specification and explanation
  return NextResponse.json(
    {
      diagramId,
      architectureSpec,
      explanation,
      status: 'generating',
      serviceCount: architectureSpec.services.length,
      model: llmModel,
      region: preferences?.region || architectureSpec.region,
    },
    { status: 200 }
  );
}
