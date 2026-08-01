/**
 * POST /api/diagrams/[id]/documents
 *
 * Document generation handler (Next.js API route).
 *
 * Generates either an ADR (Architecture Decision Record) or a pre-sales
 * document from a diagram's architecture specification.
 *
 * Request body: { type: 'adr' | 'presales' }
 * Response: { content: string, type: string }
 *
 * Validates: Requirements 17.5, 17.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDiagram } from '@/lib/db/diagrams';
import { NotFoundError } from '@/lib/db/errors';
import { generateADR, generatePreSalesDoc } from '@/lib/documents';
import type { ArchitectureSpec } from '@/types/architecture';
import type { CostEstimate } from '@/types/cost';

/**
 * Supported document types.
 */
const SUPPORTED_DOCUMENT_TYPES = ['adr', 'presales'] as const;

/**
 * Request body schema for document generation endpoint.
 */
const documentRequestSchema = z.object({
  type: z.enum(SUPPORTED_DOCUMENT_TYPES, {
    errorMap: () => ({
      message: `Document type must be one of: ${SUPPORTED_DOCUMENT_TYPES.join(', ')}`,
    }),
  }),
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
 * Parse an optional cost estimate from a diagram record.
 */
function parseCostEstimate(
  rawCost: string | object | undefined
): CostEstimate | undefined {
  if (!rawCost) return undefined;

  try {
    if (typeof rawCost === 'string') {
      return JSON.parse(rawCost) as CostEstimate;
    }
    return rawCost as CostEstimate;
  } catch {
    return undefined;
  }
}

/**
 * POST handler: Generate a document (ADR or pre-sales) from a diagram.
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

  const validation = documentRequestSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => issue.message);
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: errors,
        supportedTypes: [...SUPPORTED_DOCUMENT_TYPES],
      },
      { status: 400 }
    );
  }

  const { type } = validation.data;

  // Retrieve diagram metadata from DynamoDB
  let diagramRecord;
  try {
    diagramRecord = await getDiagram(userId, diagramId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: 'Diagram not found.' },
        { status: 404 }
      );
    }
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

  // Generate the requested document
  try {
    let content: string;

    if (type === 'adr') {
      content = generateADR(architectureSpec);
    } else {
      // Pre-sales document: include cost estimate if available
      const costEstimate = parseCostEstimate(
        (diagramRecord as Record<string, unknown>).costEstimate as
          | string
          | object
          | undefined
      );
      content = generatePreSalesDoc(architectureSpec, costEstimate);
    }

    return NextResponse.json(
      {
        content,
        type,
        diagramId,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        error: 'Failed to generate document. Please try again.',
        code: 'GENERATION_ERROR',
      },
      { status: 500 }
    );
  }
}
