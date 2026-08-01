/**
 * Diagram Engine API Route - POST /api/diagrams/render
 *
 * Accepts an ArchitectureSpec JSON payload and produces a .drawio XML file.
 * The generated diagram is stored in S3 and the XML content is returned.
 *
 * Requirements covered:
 *   - 2.1: Produce valid .drawio XML from JSON spec
 *   - 2.2: Use official AWS Architecture Icons
 *   - 2.3: Group resources into containers
 *   - 2.4: Apply layout to minimize edge crossings
 *   - 2.6: Complete within 10 seconds for up to 50 services
 *   - 2.7: Reject malformed/schema-invalid JSON with field-level errors
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateDiagram,
  validateArchitectureSpec,
  DiagramGenerationError,
} from '@/lib/diagram-engine/generator';
import type { LayoutOrientation } from '@/lib/diagram-engine/layout';
import { uploadDiagram } from '@/lib/storage/s3';
import type { ArchitectureSpec } from '@/types/architecture';

// ─── Request / Response Interfaces ────────────────────────────────────────────

interface RenderRequest {
  spec: ArchitectureSpec;
  userId?: string;
  orientation?: LayoutOrientation;
}

interface RenderResponse {
  diagramXml: string;
  s3Key: string | null;
  warnings: string[];
  processingTimeMs: number;
}

interface ErrorResponse {
  error: string;
  validationErrors?: string[];
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<RenderResponse | ErrorResponse>> {
  const startTime = performance.now();

  // Parse request body
  let body: RenderRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate the architecture spec
  const { spec, userId, orientation } = body;

  if (!spec) {
    return NextResponse.json(
      { error: 'Missing required field: spec' },
      { status: 400 }
    );
  }

  const validationErrors = validateArchitectureSpec(spec);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      {
        error: `Invalid architecture specification: ${validationErrors.length} validation error(s)`,
        validationErrors,
      },
      { status: 400 }
    );
  }

  // Generate the diagram
  try {
    const result = generateDiagram(spec, { orientation });

    // Store in S3 if userId is provided
    let s3Key: string | null = null;
    if (userId && spec.id) {
      try {
        s3Key = await uploadDiagram(userId, spec.id, result.xml);
      } catch (storageError) {
        // Log but don't fail the request - the XML is still returned
        console.error('Failed to upload diagram to S3:', storageError);
      }
    }

    const processingTimeMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      diagramXml: result.xml,
      s3Key,
      warnings: result.warnings,
      processingTimeMs,
    });
  } catch (err: unknown) {
    if (err instanceof DiagramGenerationError) {
      return NextResponse.json(
        {
          error: err.message,
          validationErrors: err.validationErrors,
        },
        { status: 400 }
      );
    }

    console.error('Unexpected error in diagram generation:', err);
    return NextResponse.json(
      { error: 'Internal server error during diagram generation' },
      { status: 500 }
    );
  }
}
