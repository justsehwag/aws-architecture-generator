/**
 * GET /api/diagrams/[id]/analysis
 *
 * Analysis Lambda handler (Next.js API route).
 *
 * Retrieves a diagram from the database, parses its architecture specification,
 * runs architecture analysis (Well-Architected evaluation, missing component
 * detection, and categorized recommendations), and returns the result.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiagram } from '@/lib/db/diagrams';
import { analyzeArchitecture } from '@/lib/analysis';
import type { ArchitectureSpec } from '@/types/architecture';
import type { ArchitectureAnalysis } from '@/types/analysis';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const diagramId = params.id;

  // Get user ID from auth headers (set by middleware or Cognito authorizer)
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

  // Ensure diagram has an architecture spec to analyze
  if (!diagramRecord.architectureSpec) {
    return NextResponse.json(
      {
        error:
          'Diagram does not have an architecture specification. Generate a diagram first.',
        code: 'NO_SPEC',
      },
      { status: 400 }
    );
  }

  // Parse the architecture spec
  let architectureSpec: ArchitectureSpec;
  try {
    architectureSpec =
      typeof diagramRecord.architectureSpec === 'string'
        ? JSON.parse(diagramRecord.architectureSpec)
        : diagramRecord.architectureSpec;
  } catch {
    return NextResponse.json(
      {
        error:
          'Failed to parse architecture specification. The diagram data may be corrupted.',
        code: 'PARSE_ERROR',
      },
      { status: 500 }
    );
  }

  // Run architecture analysis
  let analysis: ArchitectureAnalysis;
  try {
    analysis = analyzeArchitecture(architectureSpec);
  } catch {
    return NextResponse.json(
      {
        error: 'Architecture analysis failed. Please try again.',
        code: 'ANALYSIS_ERROR',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(analysis, { status: 200 });
}
