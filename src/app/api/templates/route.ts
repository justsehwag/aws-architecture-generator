/**
 * Template API Routes - GET (list) and POST (save custom)
 *
 * GET /api/templates - Returns all built-in templates + user's custom templates
 * POST /api/templates - Creates a custom template (validates name, enforces 25 limit)
 *
 * Validates: Requirements 5.1, 5.4, 5.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, unauthorizedResponse } from '@/lib/auth/api-auth';
import {
  listBuiltInTemplates,
  listUserTemplates,
  createUserTemplate,
  MAX_CUSTOM_TEMPLATES_PER_USER,
} from '@/lib/db/templates';
import { LimitExceededError } from '@/lib/db/errors';
import { getBuiltInTemplates } from '@/lib/templates/built-in-templates';
import { getCustomTemplateKey } from '@/lib/storage/constants';
import type { TemplateCategory, TemplateListItem } from '@/types/template';

/**
 * Valid template categories for validation.
 */
const VALID_CATEGORIES: TemplateCategory[] = [
  'web-application',
  'serverless',
  'microservices',
  'ai-ml',
  'data-analytics',
  'enterprise',
  'event-driven',
  'iot',
];

/**
 * GET /api/templates
 *
 * Lists all available templates (built-in + user's custom templates).
 * Built-in templates are returned from the static definitions.
 * Custom templates are queried from DynamoDB for the authenticated user.
 */
export async function GET(): Promise<NextResponse> {
  const auth = await validateApiAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error) as unknown as NextResponse;
  }

  try {
    // Get built-in templates from static definitions (fallback if DB not seeded)
    const builtInDefinitions = getBuiltInTemplates();
    const builtInItems: TemplateListItem[] = builtInDefinitions.map((t) => ({
      templateId: t.templateId,
      name: t.name,
      description: t.description,
      category: t.category,
      useCases: t.useCases,
      isBuiltIn: true,
    }));

    // Try to get DB-stored built-in templates (may have additional metadata)
    let dbBuiltIn: TemplateListItem[] = [];
    try {
      const dbRecords = await listBuiltInTemplates();
      if (dbRecords.length > 0) {
        dbBuiltIn = dbRecords.map((r) => ({
          templateId: r.templateId,
          name: r.name,
          description: r.description,
          category: r.category,
          useCases: r.useCases,
          isBuiltIn: true,
        }));
      }
    } catch {
      // If DB query fails, fall back to static definitions
    }

    // Use DB records if available, otherwise use static definitions
    const builtIn = dbBuiltIn.length > 0 ? dbBuiltIn : builtInItems;

    // Get user's custom templates
    let customTemplates: TemplateListItem[] = [];
    try {
      const userRecords = await listUserTemplates(auth.userId!);
      customTemplates = userRecords.map((r) => ({
        templateId: r.templateId,
        name: r.name,
        description: r.description,
        category: r.category,
        useCases: r.useCases,
        isBuiltIn: false,
      }));
    } catch {
      // If user templates fail to load, return built-in only
    }

    return NextResponse.json({
      templates: [...builtIn, ...customTemplates],
      builtInCount: builtIn.length,
      customCount: customTemplates.length,
      customLimit: MAX_CUSTOM_TEMPLATES_PER_USER,
    });
  } catch (error) {
    console.error('Failed to list templates:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 *
 * Saves a custom template for the authenticated user.
 * Validates:
 * - name: 1-100 characters
 * - description: 50-500 characters
 * - category: valid TemplateCategory
 * - useCases: array with at least 2 entries
 * - diagramId: required source diagram
 *
 * Enforces: 25 custom template limit per user (Requirement 5.4)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await validateApiAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error) as unknown as NextResponse;
  }

  try {
    const body = await request.json();

    // Validate required fields
    const { name, description, category, useCases, diagramId } = body;

    // Validate name: 1-100 characters
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }
    if (name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: 'Template name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Validate description: 50-500 characters
    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Template description is required' },
        { status: 400 }
      );
    }
    if (description.length < 50 || description.length > 500) {
      return NextResponse.json(
        { error: 'Template description must be between 50 and 500 characters' },
        { status: 400 }
      );
    }

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category as TemplateCategory)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate useCases: at least 2 entries
    if (!Array.isArray(useCases) || useCases.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 use cases are required' },
        { status: 400 }
      );
    }
    if (useCases.some((uc: unknown) => typeof uc !== 'string' || (uc as string).length === 0)) {
      return NextResponse.json(
        { error: 'All use cases must be non-empty strings' },
        { status: 400 }
      );
    }

    // Validate diagramId
    if (!diagramId || typeof diagramId !== 'string') {
      return NextResponse.json(
        { error: 'Source diagram ID is required' },
        { status: 400 }
      );
    }

    // Generate a unique template ID
    const templateId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const s3Key = getCustomTemplateKey(auth.userId!, templateId);

    // Create the template (enforces 25 limit internally)
    const record = await createUserTemplate(auth.userId!, {
      templateId,
      name: name.trim(),
      description: description.trim(),
      category: category as TemplateCategory,
      useCases: useCases as string[],
      s3Key,
    });

    return NextResponse.json(
      {
        template: {
          templateId: record.templateId,
          name: record.name,
          description: record.description,
          category: record.category,
          useCases: record.useCases,
          isBuiltIn: record.isBuiltIn,
          createdAt: record.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof LimitExceededError) {
      return NextResponse.json(
        {
          error: `Custom template limit reached. Maximum ${MAX_CUSTOM_TEMPLATES_PER_USER} templates allowed per user.`,
        },
        { status: 409 }
      );
    }

    console.error('Failed to save custom template:', error);
    return NextResponse.json(
      { error: 'Failed to save template' },
      { status: 500 }
    );
  }
}
