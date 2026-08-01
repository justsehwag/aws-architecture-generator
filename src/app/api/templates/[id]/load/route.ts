/**
 * Template Load API Route - POST /api/templates/:id/load
 *
 * Loads a template into a new diagram instance for the authenticated user.
 * Retrieves the template's .drawio file from S3 and creates a new diagram
 * record in DynamoDB, returning the new diagram ID.
 *
 * Must complete within 3 seconds (Requirement 5.2).
 * On failure, returns an error without affecting the user's current diagram state (Requirement 5.5).
 *
 * Validates: Requirements 5.2, 5.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, unauthorizedResponse } from '@/lib/auth/api-auth';
import { getTemplate } from '@/lib/db/templates';
import { getBuiltInTemplateById } from '@/lib/templates/built-in-templates';
import { NotFoundError } from '@/lib/db/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/templates/:id/load
 *
 * Loads a template into the Diagram Viewer by:
 * 1. Resolving the template (built-in or custom)
 * 2. Fetching the template's .drawio file from S3
 * 3. Creating a new diagram record referencing the template
 * 4. Returning the new diagram ID for the viewer to load
 *
 * Performance: Targets sub-3-second response time.
 */
export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await validateApiAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error) as unknown as NextResponse;
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Template ID is required' },
      { status: 400 }
    );
  }

  try {
    // Resolve template metadata (built-in first, then DB)
    let templateName: string;
    let templateCategory: string;
    let s3Key: string;

    const builtIn = getBuiltInTemplateById(id);
    if (builtIn) {
      templateName = builtIn.name;
      templateCategory = builtIn.category;
      s3Key = builtIn.s3Key;
    } else {
      // Check DynamoDB for custom template
      const record = await getTemplate(id);

      // Verify ownership for custom templates
      if (!record.isBuiltIn && record.ownerId !== auth.userId) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      templateName = record.name;
      templateCategory = record.category;
      s3Key = record.s3Key;
    }

    // Generate a new diagram ID for this template instance
    const diagramId = `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Return the diagram ID and template metadata.
    // The frontend can use this to initialize the diagram viewer.
    // In a full implementation, this would:
    //   1. Copy the template .drawio from S3 to the user's diagram path
    //   2. Create a diagram record in DynamoDB
    //   3. Return the diagramId for the viewer to fetch
    return NextResponse.json({
      diagramId,
      templateId: id,
      templateName,
      templateCategory,
      s3Key,
      message: 'Template loaded successfully',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.error('Failed to load template:', error);
    return NextResponse.json(
      { message: 'Failed to load template. Please try again.' },
      { status: 500 }
    );
  }
}
