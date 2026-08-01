/**
 * GET /api/diagrams/[id]/explanation
 *
 * Returns a plain-language explanation of the architecture including:
 * - Summary text with no undefined acronyms
 * - Service summary table (name, purpose, connections)
 * - Up to 10 best practice recommendations per AWS Well-Architected Framework
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiagram } from '@/lib/db/diagrams';
import { generateExplanation } from '@/lib/explanation';
import type { ArchitectureSpec } from '@/types/architecture';
import type { ArchitectureExplanation } from '@/types/api';

/**
 * Maximum allowed response time in milliseconds.
 * Requirement 8.4: Update explanation within 5 seconds when diagram is modified.
 */
const EXPLANATION_TIMEOUT_MS = 5000;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const diagramId = params.id;
  const startTime = Date.now();

  // Get user ID from auth headers
  const userId = request.headers.get('x-user-id') || 'anonymous';

  // Retrieve diagram metadata from DynamoDB
  let diagramRecord;
  try {
    diagramRecord = await getDiagram(userId, diagramId);
  } catch {
    return NextResponse.json(
      { error: 'Diagram not found' },
      { status: 404 }
    );
  }

  if (!diagramRecord) {
    return NextResponse.json(
      { error: 'Diagram not found' },
      { status: 404 }
    );
  }

  // Parse the architecture spec from diagram metadata
  let architectureSpec: ArchitectureSpec;
  try {
    architectureSpec =
      typeof diagramRecord.architectureSpec === 'string'
        ? JSON.parse(diagramRecord.architectureSpec)
        : diagramRecord.architectureSpec;
  } catch {
    return NextResponse.json(
      {
        error: 'Failed to parse architecture specification. The diagram data may be corrupted.',
        code: 'PARSE_ERROR',
      },
      { status: 500 }
    );
  }

  // Generate explanation (Requirement 8.4: within 5 seconds)
  let explanation: ArchitectureExplanation;
  try {
    explanation = generateExplanation(architectureSpec);
  } catch (_error) {
    return NextResponse.json(
      {
        error: 'Failed to generate architecture explanation. Please try again.',
        code: 'GENERATION_ERROR',
      },
      { status: 500 }
    );
  }

  // Log timing for performance monitoring
  const elapsed = Date.now() - startTime;
  if (elapsed > EXPLANATION_TIMEOUT_MS) {
    console.warn(
      `Explanation generation for diagram ${diagramId} took ${elapsed}ms (exceeds ${EXPLANATION_TIMEOUT_MS}ms target)`
    );
  }

  return NextResponse.json(explanation, { status: 200 });
}
