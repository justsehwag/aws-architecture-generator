/**
 * PUT /api/diagrams/[id]/versions/[vid]/restore
 *
 * Restores a diagram to a previous version.
 *
 * Per Requirement 10.5: The system first autosaves the current state,
 * then restores the selected version's content.
 *
 * Per Requirement 10.7: If restore fails, the current diagram state
 * is preserved unchanged.
 *
 * Validates: Requirements 10.5, 10.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { restoreVersion } from '@/lib/version/version-service';
import { uploadDiagram } from '@/lib/storage/s3';

/**
 * PUT /api/diagrams/[id]/versions/[vid]/restore
 *
 * Restores the diagram to the specified version.
 * Steps:
 * 1. Autosaves current state as a new version
 * 2. Downloads the target version content
 * 3. Overwrites the current diagram file with the restored content
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; vid: string } }
) {
  const diagramId = params.id;
  const versionId = params.vid;
  const userId = request.headers.get('x-user-id') || 'anonymous';

  if (!diagramId || !versionId) {
    return NextResponse.json(
      { error: 'Diagram ID and Version ID are required' },
      { status: 400 }
    );
  }

  try {
    // Perform the restore operation (autosaves current state first)
    const result = await restoreVersion(diagramId, userId, versionId);

    // Overwrite the current diagram file with restored content
    try {
      await uploadDiagram(userId, diagramId, result.content);
    } catch {
      // Even if the current file update fails, the autosave was made
      return NextResponse.json(
        {
          error:
            'Version was found and autosave was created, but failed to update current diagram file. Please try again.',
          autosaveVersionId: result.autosaveVersion.versionId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Version restored successfully',
      restoredVersion: {
        versionId: result.restoredVersion.versionId,
        name: result.restoredVersion.name,
        createdAt: result.restoredVersion.createdAt,
      },
      autosaveVersion: {
        versionId: result.autosaveVersion.versionId,
        createdAt: result.autosaveVersion.createdAt,
      },
      content: result.content,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to restore version. Current diagram state has been preserved.';
    const code =
      error instanceof Error && 'code' in error
        ? (error as { code: string }).code
        : 'RESTORE_FAILED';

    const status = code === 'VERSION_NOT_FOUND' ? 404 : 500;

    return NextResponse.json({ error: message, code }, { status });
  }
}
