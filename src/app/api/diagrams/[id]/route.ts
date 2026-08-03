/**
 * Get Diagram API Route - GET /api/diagrams/[id]
 *
 * Returns a single diagram's data (including XML) from DynamoDB.
 * Used by the diagram viewer as a fallback when sessionStorage is empty
 * (e.g. opening a diagram on a different device or after clearing browser data).
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/auth/api-auth';
import { getDiagram } from '@/lib/db/diagrams';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: diagramId } = await params;
  const auth = await validateApiAuth();
  const userId = auth.userId || 'anonymous';

  try {
    const diagram = await getDiagram(userId, diagramId);

    return NextResponse.json({
      diagramId: diagram.diagramId,
      name: diagram.name,
      drawioXml: diagram.architectureSpec || '',
      prompt: diagram.prompt,
      serviceCount: diagram.serviceCount,
      status: diagram.status,
      createdAt: diagram.createdAt,
      updatedAt: diagram.updatedAt,
    });
  } catch {
    return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
  }
}
