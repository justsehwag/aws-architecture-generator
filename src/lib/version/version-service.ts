/**
 * Version Management Service
 *
 * Business logic for diagram version management including:
 * - Creating named and autosave versions with 50-version limit enforcement
 * - Restoring versions (autosave current state first, then restore)
 * - Eviction policy: oldest autosaves first, never evict named versions before autosaves
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5, 10.6, 10.7
 */

import {
  createVersion,
  listVersions,
  getVersion,
  countVersions,
  deleteOldestAutosave,
  MAX_VERSIONS_PER_DIAGRAM,
  type VersionRecord,
} from '@/lib/db/versions';
import { uploadVersion, downloadDiagram } from '@/lib/storage/s3';
import { LimitExceededError } from '@/lib/db/errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SaveVersionInput {
  diagramId: string;
  userId: string;
  name: string;
  content: string;
  isAutosave?: boolean;
}

export interface RestoreVersionResult {
  restoredVersion: VersionRecord;
  autosaveVersion: VersionRecord;
  content: string;
}

export class VersionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'VersionServiceError';
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum length for a user-provided version name */
export const MAX_VERSION_NAME_LENGTH = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a unique version ID using timestamp + random suffix.
 * Follows the same pattern as other ID generators in this project.
 */
function generateVersionId(): string {
  return `ver-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Saves a version of a diagram, enforcing the 50-version limit.
 *
 * When the limit is reached, the oldest autosave is evicted first.
 * Named versions are never evicted before all autosaves are removed.
 *
 * @param input - Version save parameters
 * @returns The created version record
 * @throws {VersionServiceError} if name exceeds 100 chars or limit cannot be enforced
 */
export async function saveVersion(
  input: SaveVersionInput
): Promise<VersionRecord> {
  const { diagramId, userId, name, content, isAutosave = false } = input;

  // Validate name length (Requirement 10.2: up to 100 characters)
  if (!isAutosave && name.length > MAX_VERSION_NAME_LENGTH) {
    throw new VersionServiceError(
      `Version name must be at most ${MAX_VERSION_NAME_LENGTH} characters`,
      'INVALID_NAME'
    );
  }

  if (!isAutosave && name.trim().length === 0) {
    throw new VersionServiceError(
      'Version name cannot be empty',
      'INVALID_NAME'
    );
  }

  // Enforce 50-version limit (Requirement 10.3)
  const currentCount = await countVersions(diagramId);
  if (currentCount >= MAX_VERSIONS_PER_DIAGRAM) {
    try {
      await deleteOldestAutosave(diagramId);
    } catch (error) {
      if (error instanceof LimitExceededError) {
        throw new VersionServiceError(
          'Version limit reached and no autosaves available for eviction. Cannot save new version.',
          'LIMIT_REACHED',
          error
        );
      }
      throw new VersionServiceError(
        'Failed to evict old version',
        'EVICTION_FAILED',
        error
      );
    }
  }

  // Generate version ID and upload content to S3
  const versionId = generateVersionId();
  const s3Key = await uploadVersion(userId, diagramId, versionId, content);

  // Create version record in DynamoDB
  const record = await createVersion(diagramId, {
    versionId,
    name: isAutosave ? 'Autosave' : name,
    createdBy: userId,
    isAutosave,
    s3Key,
  });

  return record;
}

/**
 * Restores a diagram to a previous version.
 *
 * Per Requirement 10.5: First autosaves the current state, then restores
 * the selected version. If restore fails, the current state is preserved.
 *
 * @param diagramId - The diagram to restore
 * @param userId - The user performing the restore
 * @param versionId - The version ID to restore to
 * @returns The restored version record, the autosave record, and the restored content
 * @throws {VersionServiceError} if the version is not found or restore fails
 */
export async function restoreVersion(
  diagramId: string,
  userId: string,
  versionId: string
): Promise<RestoreVersionResult> {
  // 1. Get the target version record
  let targetVersion: VersionRecord;
  try {
    targetVersion = await getVersion(diagramId, versionId);
  } catch {
    throw new VersionServiceError(
      'Version not found',
      'VERSION_NOT_FOUND'
    );
  }

  // 2. Download current diagram state for autosave
  let currentContent: string;
  try {
    currentContent = await downloadDiagram(userId, diagramId);
  } catch {
    throw new VersionServiceError(
      'Failed to read current diagram state. Restore aborted.',
      'CURRENT_STATE_READ_FAILED'
    );
  }

  // 3. Autosave current state before restoring (Requirement 10.5)
  let autosaveRecord: VersionRecord;
  try {
    autosaveRecord = await saveVersion({
      diagramId,
      userId,
      name: 'Autosave',
      content: currentContent,
      isAutosave: true,
    });
  } catch (error) {
    throw new VersionServiceError(
      'Failed to autosave current state before restore. Restore aborted.',
      'AUTOSAVE_BEFORE_RESTORE_FAILED',
      error
    );
  }

  // 4. Download the target version's content from S3
  let restoredContent: string;
  try {
    // The version's s3Key points to the version file in S3
    // We need to fetch it using the S3 client directly
    restoredContent = await downloadVersionContent(targetVersion.s3Key);
  } catch {
    // Requirement 10.7: If restore fails, current state is preserved
    throw new VersionServiceError(
      'Failed to download version content. Current diagram state has been preserved.',
      'RESTORE_DOWNLOAD_FAILED'
    );
  }

  return {
    restoredVersion: targetVersion,
    autosaveVersion: autosaveRecord,
    content: restoredContent,
  };
}

/**
 * Lists all versions for a diagram in chronological order.
 *
 * @param diagramId - The diagram to list versions for
 * @returns Array of version records sorted chronologically (newest first)
 */
export async function getVersionHistory(
  diagramId: string
): Promise<VersionRecord[]> {
  return listVersions(diagramId);
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Downloads version content from S3 using the version's s3Key.
 * This is a thin wrapper that uses the S3 client directly since
 * the version key doesn't follow the standard diagram path pattern.
 */
async function downloadVersionContent(s3Key: string): Promise<string> {
  // Import dynamically to avoid circular dependency issues
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { S3_BUCKET_NAME } = await import('@/lib/storage/constants');

  const s3Client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
  });

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    })
  );

  if (!response.Body) {
    throw new Error(`Version file not found at key: ${s3Key}`);
  }

  return response.Body.transformToString('utf-8');
}
