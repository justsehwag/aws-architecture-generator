/**
 * POST /api/diagrams/[id]/iac
 *
 * IaC Lambda handler (Next.js API route).
 *
 * Generates Infrastructure as Code (Terraform, CDK TypeScript, or CloudFormation)
 * from a diagram's architecture specification.
 *
 * Returns the generated code, any warnings about unsupported services,
 * and the resource count.
 *
 * Rejects architectures with more than 50 resource nodes.
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDiagram } from '@/lib/db/diagrams';
import {
  generateIaC,
  isSupportedIaCFormat,
  ResourceLimitError,
  SUPPORTED_IAC_FORMATS,
} from '@/lib/iac';
import type { ArchitectureSpec } from '@/types/architecture';

/**
 * Request body schema for IaC generation endpoint.
 */
const iacRequestSchema = z.object({
  format: z.string().min(1, { message: 'Format is required' }),
});

/**
 * Parse the architecture spec from a diagram record.
 * Handles both string (JSON) and object forms.
 */
function parseArchitectureSpec(
  rawSpec: string | object | undefined
): ArchitectureSpec | null {
  if (!rawSpec) return null;

  try {
    if (typeof rawSpec === 'string') {
      return JSON.parse(rawSpec) as ArchitectureSpec;
    }
    return rawSpec as ArchitectureSpec;
  } catch {
    return null;
  }
}

/**
 * POST handler: Generate IaC code from a diagram.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const diagramId = params.id;
  const userId = request.headers.get('x-user-id') || 'anonymous';

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 }
    );
  }

  const validation = iacRequestSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => issue.message);
    return NextResponse.json(
      { error: 'Validation failed', details: errors },
      { status: 400 }
    );
  }

  const { format } = validation.data;

  // Validate IaC format
  if (!isSupportedIaCFormat(format)) {
    return NextResponse.json(
      {
        error: `Unsupported IaC format: "${format}". Supported formats are: ${SUPPORTED_IAC_FORMATS.join(', ')}`,
        supportedFormats: SUPPORTED_IAC_FORMATS,
      },
      { status: 400 }
    );
  }

  // Retrieve diagram metadata from DynamoDB
  let diagramRecord;
  try {
    diagramRecord = await getDiagram(userId, diagramId);
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve diagram. Please try again.' },
      { status: 500 }
    );
  }

  if (!diagramRecord) {
    return NextResponse.json(
      { error: 'Diagram not found.' },
      { status: 404 }
    );
  }

  // Parse architecture spec
  const architectureSpec = parseArchitectureSpec(diagramRecord.architectureSpec);

  if (!architectureSpec) {
    return NextResponse.json(
      {
        error: 'Failed to parse architecture specification.',
        code: 'PARSE_ERROR',
      },
      { status: 500 }
    );
  }

  // Ensure services array exists
  if (!architectureSpec.services || !Array.isArray(architectureSpec.services)) {
    return NextResponse.json(
      {
        code: '',
        format,
        warnings: [],
        resourceCount: 0,
      },
      { status: 200 }
    );
  }

  // Generate IaC code
  try {
    const result = generateIaC(architectureSpec, format);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Handle resource limit exceeded (Requirement 14.6)
    if (error instanceof ResourceLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'RESOURCE_LIMIT_EXCEEDED',
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        error: 'Failed to generate IaC code. Please try again.',
        code: 'GENERATION_ERROR',
      },
      { status: 500 }
    );
  }
}
