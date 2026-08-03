/**
 * Save Diagram API Route - POST /api/diagrams/save
 *
 * Persists diagram XML to DynamoDB for cross-device sync.
 * Creates a new record or updates an existing one.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/auth/api-auth';
import { createDiagram, updateDiagram } from '@/lib/db/diagrams';

export async function POST(request: NextRequest) {
  // Authenticate — fall back to 'anonymous' for unauthenticated users
  const auth = await validateApiAuth();
  const userId = auth.userId || 'anonymous';

  let body: {
    diagramId: string;
    name: string;
    prompt: string;
    drawioXml: string;
    serviceCount?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { diagramId, name, prompt, drawioXml, serviceCount } = body;

  if (!diagramId || !drawioXml) {
    return NextResponse.json(
      { error: 'diagramId and drawioXml are required' },
      { status: 400 }
    );
  }

  try {
    // Attempt to create a new diagram record
    await createDiagram(userId, {
      diagramId,
      name: name || 'Untitled',
      prompt: prompt || '',
      architectureSpec: drawioXml,
      s3Key: `diagrams/${userId}/${diagramId}/diagram.drawio`,
      serviceCount: serviceCount || 0,
      status: 'ready',
    });

    return NextResponse.json({ success: true, diagramId });
  } catch {
    // If diagram already exists (ConditionalCheckFailed), update it instead
    try {
      await updateDiagram(userId, diagramId, {
        architectureSpec: drawioXml,
        name: name || undefined,
        serviceCount: serviceCount || undefined,
        status: 'ready',
      });
      return NextResponse.json({ success: true, diagramId, updated: true });
    } catch {
      return NextResponse.json(
        { error: 'Failed to save diagram' },
        { status: 500 }
      );
    }
  }
}
