/**
 * GET /api/diagrams/[id]/cost
 * PUT /api/diagrams/[id]/cost
 *
 * Cost Lambda handler (Next.js API route).
 *
 * GET: Calculate estimated monthly cost with default usage assumptions.
 * PUT: Recalculate with user-provided usage assumptions.
 *
 * Returns per-service cost breakdown in USD (2 decimal places) and total.
 * Services with unavailable pricing are marked as such and excluded from
 * the total. Architectures with no AWS services return $0.00.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5, 7.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiagram } from '@/lib/db/diagrams';
import { estimateCost, DEFAULT_ASSUMPTIONS } from '@/lib/cost';
import type { ArchitectureSpec } from '@/types/architecture';
import type { UsageAssumptions } from '@/types/cost';

/**
 * Validate that usage assumptions are within acceptable ranges.
 * Returns an error message if invalid, or null if valid.
 */
function validateAssumptions(assumptions: unknown): string | null {
  if (typeof assumptions !== 'object' || assumptions === null) {
    return 'Usage assumptions must be an object.';
  }

  const a = assumptions as Record<string, unknown>;

  if (
    a.computeHoursPerMonth !== undefined &&
    (typeof a.computeHoursPerMonth !== 'number' ||
      a.computeHoursPerMonth < 0 ||
      a.computeHoursPerMonth > 8760)
  ) {
    return 'computeHoursPerMonth must be a number between 0 and 8760.';
  }

  if (
    a.requestsPerMonth !== undefined &&
    (typeof a.requestsPerMonth !== 'number' ||
      a.requestsPerMonth < 1 ||
      a.requestsPerMonth > 10_000_000_000)
  ) {
    return 'requestsPerMonth must be a number between 1 and 10,000,000,000.';
  }

  if (
    a.dataTransferGB !== undefined &&
    (typeof a.dataTransferGB !== 'number' ||
      a.dataTransferGB < 0 ||
      a.dataTransferGB > 102_400)
  ) {
    return 'dataTransferGB must be a number between 0 and 102,400 (100 TB).';
  }

  if (
    a.storageGB !== undefined &&
    (typeof a.storageGB !== 'number' ||
      a.storageGB < 0 ||
      a.storageGB > 1_073_741_824)
  ) {
    return 'storageGB must be a number between 0 and 1,073,741,824 (1 PB).';
  }

  return null;
}

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
 * GET handler: Calculate cost with default assumptions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const diagramId = params.id;
  const userId = request.headers.get('x-user-id') || 'anonymous';

  // Retrieve diagram metadata from DynamoDB
  let diagramRecord;
  try {
    diagramRecord = await getDiagram(userId, diagramId);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve diagram. Please try again.' },
      { status: 500 }
    );
  }

  if (!diagramRecord) {
    return NextResponse.json(
      { error: 'Diagram not found' },
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

  // If no services array exists, treat as empty architecture
  if (!architectureSpec.services || !Array.isArray(architectureSpec.services)) {
    return NextResponse.json(
      {
        totalMonthlyCost: 0,
        services: [],
        assumptions: DEFAULT_ASSUMPTIONS,
      },
      { status: 200 }
    );
  }

  // Calculate cost estimate with default assumptions
  const costEstimate = estimateCost(architectureSpec, DEFAULT_ASSUMPTIONS);

  return NextResponse.json(costEstimate, { status: 200 });
}

/**
 * PUT handler: Recalculate cost with user-provided assumptions.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const diagramId = params.id;
  const userId = request.headers.get('x-user-id') || 'anonymous';

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 }
    );
  }

  // Validate assumptions from request body
  const assumptions = body.assumptions;
  const validationError = validateAssumptions(assumptions);
  if (validationError) {
    return NextResponse.json(
      { error: validationError, code: 'INVALID_ASSUMPTIONS' },
      { status: 400 }
    );
  }

  // Merge provided assumptions with defaults
  const mergedAssumptions: UsageAssumptions = {
    computeHoursPerMonth:
      (assumptions as Record<string, number>).computeHoursPerMonth ??
      DEFAULT_ASSUMPTIONS.computeHoursPerMonth,
    requestsPerMonth:
      (assumptions as Record<string, number>).requestsPerMonth ??
      DEFAULT_ASSUMPTIONS.requestsPerMonth,
    dataTransferGB:
      (assumptions as Record<string, number>).dataTransferGB ??
      DEFAULT_ASSUMPTIONS.dataTransferGB,
    storageGB:
      (assumptions as Record<string, number>).storageGB ??
      DEFAULT_ASSUMPTIONS.storageGB,
  };

  // Retrieve diagram metadata from DynamoDB
  let diagramRecord;
  try {
    diagramRecord = await getDiagram(userId, diagramId);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve diagram. Please try again.' },
      { status: 500 }
    );
  }

  if (!diagramRecord) {
    return NextResponse.json(
      { error: 'Diagram not found' },
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

  // If no services array exists, treat as empty architecture
  if (!architectureSpec.services || !Array.isArray(architectureSpec.services)) {
    return NextResponse.json(
      {
        totalMonthlyCost: 0,
        services: [],
        assumptions: mergedAssumptions,
      },
      { status: 200 }
    );
  }

  // Calculate cost estimate with user-provided assumptions
  const costEstimate = estimateCost(architectureSpec, mergedAssumptions);

  return NextResponse.json(costEstimate, { status: 200 });
}
