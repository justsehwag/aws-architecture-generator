/**
 * POST /api/diagrams/[id]/export
 *
 * Export Lambda handler (Next.js API route).
 *
 * Accepts a format and optional export options, generates the diagram
 * in the requested format, uploads to S3, and returns a presigned
 * download URL.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  exportDiagram,
  isSupportedFormat,
  SUPPORTED_FORMATS,
  type ExportFormat,
} from '@/lib/export';
import { uploadExport, getPresignedDownloadUrl } from '@/lib/storage/s3';
import { downloadDiagram } from '@/lib/storage/s3';
import { getDiagram } from '@/lib/db/diagrams';
import type { ArchitectureSpec } from '@/types/architecture';
import type { ExportResponse } from '@/types/api';
import { PRESIGNED_URL_EXPIRY } from '@/lib/storage/constants';

/**
 * Request body schema for export endpoint.
 */
const exportRequestSchema = z.object({
  format: z.string().min(1, { message: 'Format is required' }),
  options: z
    .object({
      pngDpi: z.number().min(300).optional(),
      pdfPageSize: z.enum(['a4', 'letter', 'a3']).optional(),
    })
    .optional(),
});

/**
 * Maximum allowed export duration in milliseconds.
 * Requirement 4.1: Complete export within 5 seconds for up to 50 components.
 */
const EXPORT_TIMEOUT_MS = 5000;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const diagramId = params.id;
  const startTime = Date.now();

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

  const validation = exportRequestSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => issue.message);
    return NextResponse.json(
      { error: 'Validation failed', details: errors },
      { status: 400 }
    );
  }

  const { format, options } = validation.data;

  // Requirement 4.8: Reject unsupported formats with the list of supported formats
  if (!isSupportedFormat(format)) {
    return NextResponse.json(
      {
        error: `Unsupported export format: "${format}". Supported formats are: ${SUPPORTED_FORMATS.join(', ')}`,
        supportedFormats: SUPPORTED_FORMATS,
      },
      { status: 400 }
    );
  }

  const exportFormat: ExportFormat = format;

  // Get user ID from auth headers
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

  // Download the .drawio XML from S3
  let drawioXml: string;
  try {
    drawioXml = await downloadDiagram(userId, diagramId);
  } catch {
    return NextResponse.json(
      {
        error: 'Failed to retrieve diagram file. Please try again.',
        code: 'STORAGE_ERROR',
      },
      { status: 500 }
    );
  }

  // Parse the architecture spec from diagram metadata
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

  // Perform the export (Requirement 4.1: within 5 seconds)
  let exportResult;
  try {
    exportResult = exportDiagram(exportFormat, drawioXml, architectureSpec, options);
  } catch {
    // Requirement 4.9: Return error without producing partial file
    return NextResponse.json(
      {
        error: `Export to ${format} failed due to a processing error. Please try again.`,
        code: 'EXPORT_ERROR',
      },
      { status: 500 }
    );
  }

  // Check if export exceeded time limit
  const elapsed = Date.now() - startTime;
  if (elapsed > EXPORT_TIMEOUT_MS) {
    console.warn(
      `Export to ${format} for diagram ${diagramId} took ${elapsed}ms (exceeds ${EXPORT_TIMEOUT_MS}ms target)`
    );
  }

  // Upload the export result to S3
  let s3Key: string;
  try {
    s3Key = await uploadExport(
      userId,
      diagramId,
      exportResult.fileExtension,
      exportResult.buffer
    );
  } catch {
    return NextResponse.json(
      {
        error: 'Failed to store export file. Please try again.',
        code: 'STORAGE_ERROR',
      },
      { status: 500 }
    );
  }

  // Generate presigned download URL
  let downloadUrl: string;
  try {
    downloadUrl = await getPresignedDownloadUrl(s3Key);
  } catch {
    return NextResponse.json(
      {
        error: 'Failed to generate download link. Please try again.',
        code: 'URL_ERROR',
      },
      { status: 500 }
    );
  }

  // Build response
  const expiresAt = new Date(Date.now() + PRESIGNED_URL_EXPIRY * 1000).toISOString();

  const response: ExportResponse = {
    downloadUrl,
    expiresAt,
    format: exportFormat,
    fileSizeBytes: exportResult.buffer.length,
  };

  return NextResponse.json(response, { status: 200 });
}
