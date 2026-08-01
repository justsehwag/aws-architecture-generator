/**
 * S3 File Operations Layer
 *
 * Provides upload, download, presigned URL generation, and file management
 * for diagram files stored in S3.
 *
 * File structure:
 *   diagrams/{userId}/{diagramId}/diagram.drawio
 *   diagrams/{userId}/{diagramId}/exports/diagram.{format}
 *   diagrams/{userId}/{diagramId}/versions/{versionId}.drawio
 *
 * Enforces a 50 MB max file size per Requirement 16.4.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  MAX_FILE_SIZE,
  PRESIGNED_URL_EXPIRY,
  S3_BUCKET_NAME,
  getDiagramKey,
  getExportKey,
  getVersionKey,
} from './constants';

// ─── S3 Client Configuration ─────────────────────────────────────────────────

const s3AccessKeyId = process.env.BEDROCK_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY;

const s3ClientConfig: { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {
  region: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'ap-south-2',
};

if (s3AccessKeyId && s3SecretAccessKey) {
  s3ClientConfig.credentials = { accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey };
}

const s3Client = new S3Client(s3ClientConfig);

// ─── Error Classes ────────────────────────────────────────────────────────────

export class FileSizeExceededError extends Error {
  constructor(actualSize: number) {
    super(
      `File size ${actualSize} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes (50 MB)`
    );
    this.name = 'FileSizeExceededError';
  }
}

export class FileNotFoundError extends Error {
  constructor(key: string) {
    super(`File not found: ${key}`);
    this.name = 'FileNotFoundError';
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate that content size does not exceed the maximum file size.
 * @throws {FileSizeExceededError} if content exceeds 50 MB
 */
function validateFileSize(content: string | Buffer): void {
  const size =
    typeof content === 'string' ? Buffer.byteLength(content, 'utf-8') : content.length;
  if (size > MAX_FILE_SIZE) {
    throw new FileSizeExceededError(size);
  }
}

// ─── Upload Operations ────────────────────────────────────────────────────────

/**
 * Upload a .drawio XML diagram to S3.
 *
 * @param userId - The owning user's ID
 * @param diagramId - The diagram's unique ID
 * @param content - The .drawio XML content as a string
 * @returns The S3 key where the file was stored
 * @throws {FileSizeExceededError} if content exceeds 50 MB
 * @throws {StorageError} on S3 operation failure
 */
export async function uploadDiagram(
  userId: string,
  diagramId: string,
  content: string
): Promise<string> {
  validateFileSize(content);

  const key = getDiagramKey(userId, diagramId);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: content,
        ContentType: 'application/xml',
        Metadata: {
          userId,
          diagramId,
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    return key;
  } catch (error) {
    throw new StorageError(`Failed to upload diagram: ${key}`, error);
  }
}

/**
 * Upload an export file (PNG, SVG, PDF, etc.) to S3.
 *
 * @param userId - The owning user's ID
 * @param diagramId - The diagram's unique ID
 * @param format - The export format (e.g., 'png', 'svg', 'pdf')
 * @param buffer - The export file content as a Buffer
 * @returns The S3 key where the file was stored
 * @throws {FileSizeExceededError} if content exceeds 50 MB
 * @throws {StorageError} on S3 operation failure
 */
export async function uploadExport(
  userId: string,
  diagramId: string,
  format: string,
  buffer: Buffer
): Promise<string> {
  validateFileSize(buffer);

  const key = getExportKey(userId, diagramId, format);

  const contentTypeMap: Record<string, string> = {
    png: 'image/png',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    json: 'application/json',
    md: 'text/markdown',
    drawio: 'application/xml',
  };

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentTypeMap[format] ?? 'application/octet-stream',
        Metadata: {
          userId,
          diagramId,
          format,
          exportedAt: new Date().toISOString(),
        },
      })
    );

    return key;
  } catch (error) {
    throw new StorageError(
      `Failed to upload export (${format}): ${key}`,
      error
    );
  }
}

/**
 * Upload a versioned snapshot of a diagram to S3.
 *
 * @param userId - The owning user's ID
 * @param diagramId - The diagram's unique ID
 * @param versionId - The version's unique ID
 * @param content - The .drawio XML content for this version
 * @returns The S3 key where the version was stored
 * @throws {FileSizeExceededError} if content exceeds 50 MB
 * @throws {StorageError} on S3 operation failure
 */
export async function uploadVersion(
  userId: string,
  diagramId: string,
  versionId: string,
  content: string
): Promise<string> {
  validateFileSize(content);

  const key = getVersionKey(userId, diagramId, versionId);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: content,
        ContentType: 'application/xml',
        Metadata: {
          userId,
          diagramId,
          versionId,
          createdAt: new Date().toISOString(),
        },
      })
    );

    return key;
  } catch (error) {
    throw new StorageError(`Failed to upload version: ${key}`, error);
  }
}

// ─── Download Operations ──────────────────────────────────────────────────────

/**
 * Download a diagram's current .drawio content from S3.
 *
 * @param userId - The owning user's ID
 * @param diagramId - The diagram's unique ID
 * @returns The .drawio XML content as a string
 * @throws {FileNotFoundError} if the diagram does not exist
 * @throws {StorageError} on S3 operation failure
 */
export async function downloadDiagram(
  userId: string,
  diagramId: string
): Promise<string> {
  const key = getDiagramKey(userId, diagramId);

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new FileNotFoundError(key);
    }

    return await response.Body.transformToString('utf-8');
  } catch (error) {
    if (
      error instanceof FileNotFoundError ||
      (error as { name?: string })?.name === 'NoSuchKey'
    ) {
      throw new FileNotFoundError(key);
    }
    throw new StorageError(`Failed to download diagram: ${key}`, error);
  }
}

// ─── Presigned URL Generation ─────────────────────────────────────────────────

/**
 * Generate a presigned GET URL for downloading a file from S3.
 *
 * @param key - The S3 object key
 * @param expiresIn - URL expiry in seconds (default: 1 hour)
 * @returns A presigned URL for downloading the object
 * @throws {StorageError} on URL generation failure
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    throw new StorageError(
      `Failed to generate presigned download URL for: ${key}`,
      error
    );
  }
}

/**
 * Generate a presigned PUT URL for uploading a file to S3.
 * Enforces a maximum content-length of 50 MB by default.
 *
 * @param key - The S3 object key
 * @param maxSize - Maximum upload size in bytes (default: 50 MB)
 * @returns A presigned URL for uploading the object
 * @throws {StorageError} on URL generation failure
 */
export async function getPresignedUploadUrl(
  key: string,
  maxSize: number = MAX_FILE_SIZE
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentLength: maxSize,
    });

    return await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });
  } catch (error) {
    throw new StorageError(
      `Failed to generate presigned upload URL for: ${key}`,
      error
    );
  }
}

// ─── Delete Operations ────────────────────────────────────────────────────────

/**
 * Delete all files associated with a diagram (current file, exports, versions).
 *
 * @param userId - The owning user's ID
 * @param diagramId - The diagram's unique ID
 * @throws {StorageError} on S3 operation failure
 */
export async function deleteDiagramFiles(
  userId: string,
  diagramId: string
): Promise<void> {
  const prefix = `diagrams/${userId}/${diagramId}/`;

  try {
    // List all objects under the diagram prefix
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix,
      })
    );

    const objects = listResponse.Contents;
    if (!objects || objects.length === 0) {
      return; // Nothing to delete
    }

    // Delete all objects in a single batch request
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET_NAME,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key })),
          Quiet: true,
        },
      })
    );
  } catch (error) {
    throw new StorageError(
      `Failed to delete diagram files for: ${prefix}`,
      error
    );
  }
}

// ─── List Operations ──────────────────────────────────────────────────────────

export interface ExportFileInfo {
  key: string;
  format: string;
  lastModified?: Date;
  size?: number;
}

/**
 * List all available export files for a diagram.
 *
 * @param userId - The owning user's ID
 * @param diagramId - The diagram's unique ID
 * @returns An array of export file metadata
 * @throws {StorageError} on S3 operation failure
 */
export async function listDiagramExports(
  userId: string,
  diagramId: string
): Promise<ExportFileInfo[]> {
  const prefix = `diagrams/${userId}/${diagramId}/exports/`;

  try {
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix,
      })
    );

    const objects = listResponse.Contents;
    if (!objects || objects.length === 0) {
      return [];
    }

    return objects
      .filter((obj) => obj.Key != null)
      .map((obj) => {
        // Extract format from key: diagrams/.../exports/diagram.{format}
        const filename = obj.Key!.split('/').pop() ?? '';
        const format = filename.split('.').pop() ?? '';

        return {
          key: obj.Key!,
          format,
          lastModified: obj.LastModified,
          size: obj.Size,
        };
      });
  } catch (error) {
    throw new StorageError(
      `Failed to list exports for diagram: ${diagramId}`,
      error
    );
  }
}
