/**
 * Template API Routes - GET (fetch single) and DELETE
 *
 * GET /api/templates/:id - Fetch a single template by ID
 * DELETE /api/templates/:id - Delete a custom template (only owner can delete)
 *
 * Validates: Requirements 5.2, 5.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, unauthorizedResponse } from '@/lib/auth/api-auth';
import { getTemplate, deleteTemplate } from '@/lib/db/templates';
import { NotFoundError } from '@/lib/db/errors';
import { getBuiltInTemplateById } from '@/lib/templates/built-in-templates';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/templates/:id
 *
 * Fetches a single template by its ID. Checks both built-in static
 * definitions and DynamoDB records.
 */
export async function GET(
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
    // First check if it's a built-in template from static definitions
    const builtIn = getBuiltInTemplateById(id);
    if (builtIn) {
      return NextResponse.json({
        template: {
          templateId: builtIn.templateId,
          name: builtIn.name,
          description: builtIn.description,
          category: builtIn.category,
          useCases: builtIn.useCases,
          isBuiltIn: true,
          s3Key: builtIn.s3Key,
        },
      });
    }

    // Try to fetch from DynamoDB
    const record = await getTemplate(id);

    // If it's a custom template, verify the user owns it
    if (!record.isBuiltIn && record.ownerId !== auth.userId) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      template: {
        templateId: record.templateId,
        name: record.name,
        description: record.description,
        category: record.category,
        useCases: record.useCases,
        isBuiltIn: record.isBuiltIn,
        s3Key: record.s3Key,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.error('Failed to fetch template:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/:id
 *
 * Deletes a custom template. Only the owner of a custom template can delete it.
 * Built-in templates cannot be deleted.
 */
export async function DELETE(
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
    // Check if it's a built-in template (cannot delete)
    const builtIn = getBuiltInTemplateById(id);
    if (builtIn) {
      return NextResponse.json(
        { error: 'Built-in templates cannot be deleted' },
        { status: 403 }
      );
    }

    // Fetch the template to verify ownership
    const record = await getTemplate(id);

    if (!record.isBuiltIn && record.ownerId !== auth.userId) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (record.isBuiltIn) {
      return NextResponse.json(
        { error: 'Built-in templates cannot be deleted' },
        { status: 403 }
      );
    }

    // Delete the template from DynamoDB
    await deleteTemplate(id);

    return NextResponse.json(
      { message: 'Template deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.error('Failed to delete template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
