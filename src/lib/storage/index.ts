/**
 * Storage Module - Barrel Export
 *
 * Provides S3 file operations for diagram storage, export management,
 * version management, and presigned URL generation.
 */

export {
  uploadDiagram,
  downloadDiagram,
  uploadExport,
  uploadVersion,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  deleteDiagramFiles,
  listDiagramExports,
  FileSizeExceededError,
  FileNotFoundError,
  StorageError,
} from './s3';

export type { ExportFileInfo } from './s3';

export {
  MAX_FILE_SIZE,
  PRESIGNED_URL_EXPIRY,
  S3_BUCKET_NAME,
  getDiagramKey,
  getExportKey,
  getVersionKey,
  getTemplateKey,
  getCustomTemplateKey,
} from './constants';
