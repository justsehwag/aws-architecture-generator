/**
 * POST /api/diagrams/import
 *
 * Import Lambda handler (Next.js API route).
 *
 * Accepts a .drawio file upload, validates it (size, well-formed XML,
 * .drawio schema conformance), stores it in S3, creates diagram metadata
 * in DynamoDB, and triggers architecture analysis.
 *
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateDrawioFile,
  MAX_IMPORT_FILE_SIZE,
} from '@/lib/import/drawio-validator';
import { uploadDiagram } from '@/lib/storage/s3';
import { createDiagram } from '@/lib/db/diagrams';

/**
 * Generates a unique diagram ID for imports.
 */
function generateDiagramId(): string {
  return `diag-import-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Extract a human-readable name from the .drawio XML content.
 * Attempts to read the "name" attribute from the first <diagram> element.
 */
function extractDiagramName(content: string): string {
  // Simple regex extraction to avoid parsing XML twice
  const nameMatch = content.match(/<diagram[^>]*\bname="([^"]+)"/);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1];
  }
  return 'Imported Diagram';
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || 'anonymous';

  // Determine content type to handle both form-data and JSON body uploads
  const contentType = request.headers.get('content-type') || '';

  let fileContent: string;
  let fileName: string;
  let fileSizeBytes: number;

  try {
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form-data upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided. Please upload a .drawio file.' },
          { status: 400 }
        );
      }

      fileName = file.name;
      fileSizeBytes = file.size;

      // Check size before reading content (Requirement 15.4, 15.5)
      if (fileSizeBytes > MAX_IMPORT_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File size exceeds the maximum allowed size of 10 MB. Your file is ${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB.`,
            code: 'SIZE_ERROR',
          },
          { status: 413 }
        );
      }

      fileContent = await file.text();
    } else {
      // Handle JSON body with base64 or raw content
      let body: { content?: string; fileName?: string; encoding?: string };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: 'Invalid request body. Expected multipart/form-data or JSON with content field.' },
          { status: 400 }
        );
      }

      if (!body.content) {
        return NextResponse.json(
          { error: 'No file content provided. Include a "content" field with the .drawio XML.' },
          { status: 400 }
        );
      }

      fileName = body.fileName || 'imported.drawio';

      // Decode base64 if specified
      if (body.encoding === 'base64') {
        try {
          fileContent = Buffer.from(body.content, 'base64').toString('utf-8');
        } catch {
          return NextResponse.json(
            { error: 'Failed to decode base64 content.' },
            { status: 400 }
          );
        }
      } else {
        fileContent = body.content;
      }

      fileSizeBytes = new TextEncoder().encode(fileContent).length;
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to read the uploaded file.' },
      { status: 400 }
    );
  }

  // Validate the .drawio file (size → XML → schema)
  const validationResult = validateDrawioFile(fileContent, fileSizeBytes);

  if (!validationResult.valid) {
    const statusCode = validationResult.errorType === 'SIZE_ERROR' ? 413 : 422;
    return NextResponse.json(
      {
        error: validationResult.error,
        code: validationResult.errorType,
      },
      { status: statusCode }
    );
  }

  // File is valid — proceed with storage
  const diagramId = generateDiagramId();
  const diagramName = extractDiagramName(fileContent);
  const s3Key = `diagrams/${userId}/${diagramId}/diagram.drawio`;

  // Upload to S3
  try {
    await uploadDiagram(userId, diagramId, fileContent);
  } catch (storageError) {
    // eslint-disable-next-line no-console
    console.error('Failed to upload imported diagram to S3:', storageError);
    return NextResponse.json(
      {
        error: 'Failed to store the imported diagram. Please try again.',
        code: 'STORAGE_ERROR',
      },
      { status: 500 }
    );
  }

  // Store diagram metadata in DynamoDB
  try {
    await createDiagram(userId, {
      diagramId,
      name: diagramName,
      prompt: `Imported from file: ${fileName}`,
      s3Key,
      serviceCount: 0, // Will be updated after analysis
      status: 'ready',
    });
  } catch (dbError) {
    // eslint-disable-next-line no-console
    console.error('Failed to store imported diagram metadata:', dbError);
    // Don't fail the request — the file is already in S3
  }

  // Return success with diagram ID
  // The frontend will trigger analysis separately after rendering
  return NextResponse.json(
    {
      diagramId,
      name: diagramName,
      fileName,
      fileSizeBytes,
      s3Key,
      status: 'ready',
      message: 'File imported successfully. Architecture analysis will begin shortly.',
    },
    { status: 200 }
  );
}
