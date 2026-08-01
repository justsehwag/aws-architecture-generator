/**
 * GET /api/diagrams/[id]/versions
 * POST /api/diagrams/[id]/versions
 *
 * Version management API routes.
 *
 * GET: Lists versions for a diagram in chronological order,
 *      showing name/Autosave label, timestamp, and user.
 *
 * POST: Creates a named version snapshot with a user-provided name
 *       (validated: 1-100 chars).
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  saveVersion,
  getVersionHistory,
  MAX_VERSION_NAME_LENGTH,
} from '@/lib/version/version-service';
import { downloadDiagram } from '@/lib/storage/s3';

/**
 * Request body schema for creating a named version.
 */
const createVersionSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Version name is required' })
    .max(MAX_VERSION_NAME_LENGTH, {
      message: `Version name must be at most ${MAX_VERSION_NAME_LENGTH} characters`,
    }),
  content: z
    .string()
    .min(1, { message: 'Diagram content is required' })
    .optional(),
  isAutosave: z.boolean().optional(),
});

/**
 * GET /api/diagrams/[id]/versions
 *
 * Lists all versions for a diagram in reverse chronological order.
 * Each entry includes: versionId, name (or "Autosave"), timestamp, user, isAutosave.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const diagramId = params.id;

  if (!diagramId) {
    return NextResponse.json(
      { error: 'Diagram ID is required' },
      { status: 400 }
    );
  }

  try {
    const versions = await getVersionHistory(diagramId);

    return NextResponse.json({
      diagramId,
      versions: versions.map((v) => ({
        versionId: v.versionId,
        name: v.name,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
        isAutosave: v.isAutosave,
      })),
      total: versions.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve version history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/diagrams/[id]/versions
 *
 * Creates a named version snapshot for the diagram.
 * Validates that the name is 1-100 characters.
 * If content is not provided in the body, downloads current diagram state from S3.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const diagramId = params.id;
  const userId = request.headers.get('x-user-id') || 'anonymous';

  if (!diagramId) {
    return NextResponse.json(
      { error: 'Diagram ID is required' },
      { status: 400 }
    );
  }

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

  const validation = createVersionSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => issue.message);
    return NextResponse.json(
      { error: 'Validation failed', details: errors },
      { status: 400 }
    );
  }

  const { name, content: providedContent, isAutosave } = validation.data;

  // Get diagram content - use provided content or download from S3
  let content: string;
  if (providedContent) {
    content = providedContent;
  } else {
    try {
      content = await downloadDiagram(userId, diagramId);
    } catch {
      return NextResponse.json(
        { error: 'Failed to read current diagram state' },
        { status: 500 }
      );
    }
  }

  // Save the version (named or autosave)
  try {
    const version = await saveVersion({
      diagramId,
      userId,
      name,
      content,
      isAutosave: isAutosave ?? false,
    });

    return NextResponse.json(
      {
        versionId: version.versionId,
        name: version.name,
        createdAt: version.createdAt,
        createdBy: version.createdBy,
        isAutosave: version.isAutosave,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create version';
    const status =
      error instanceof Error && 'code' in error
        ? (error as { code: string }).code === 'INVALID_NAME'
          ? 400
          : (error as { code: string }).code === 'LIMIT_REACHED'
            ? 409
            : 500
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
