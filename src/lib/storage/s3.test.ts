import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
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
import { MAX_FILE_SIZE } from './constants';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    ListObjectsV2Command: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectsCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned-url.example.com'),
}));

// Get reference to mocked send
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getMockSend() {
  const client = new S3Client({});
  return client.send as ReturnType<typeof vi.fn>;
}

describe('S3 Storage Operations', () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = getMockSend();
  });

  describe('uploadDiagram', () => {
    it('uploads a diagram and returns the S3 key', async () => {
      mockSend.mockResolvedValueOnce({});

      const key = await uploadDiagram('user-1', 'diagram-1', '<xml>diagram</xml>');

      expect(key).toBe('diagrams/user-1/diagram-1/diagram.drawio');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('throws FileSizeExceededError when content exceeds 50 MB', async () => {
      const largeContent = 'x'.repeat(MAX_FILE_SIZE + 1);

      await expect(
        uploadDiagram('user-1', 'diagram-1', largeContent)
      ).rejects.toThrow(FileSizeExceededError);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('throws StorageError when S3 operation fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 network error'));

      await expect(
        uploadDiagram('user-1', 'diagram-1', '<xml/>')
      ).rejects.toThrow(StorageError);
    });

    it('accepts content exactly at the 50 MB limit', async () => {
      // Create content that is exactly MAX_FILE_SIZE in bytes
      const content = 'a'.repeat(MAX_FILE_SIZE);
      mockSend.mockResolvedValueOnce({});

      const key = await uploadDiagram('user-1', 'diagram-1', content);
      expect(key).toBe('diagrams/user-1/diagram-1/diagram.drawio');
    });
  });

  describe('downloadDiagram', () => {
    it('downloads and returns diagram content', async () => {
      mockSend.mockResolvedValueOnce({
        Body: {
          transformToString: vi.fn().mockResolvedValue('<xml>content</xml>'),
        },
      });

      const content = await downloadDiagram('user-1', 'diagram-1');

      expect(content).toBe('<xml>content</xml>');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('throws FileNotFoundError when Body is null', async () => {
      mockSend.mockResolvedValueOnce({ Body: null });

      await expect(downloadDiagram('user-1', 'diagram-1')).rejects.toThrow(
        FileNotFoundError
      );
    });

    it('throws FileNotFoundError on NoSuchKey error', async () => {
      const error = new Error('Not found');
      (error as unknown as { name: string }).name = 'NoSuchKey';
      mockSend.mockRejectedValueOnce(error);

      await expect(downloadDiagram('user-1', 'diagram-1')).rejects.toThrow(
        FileNotFoundError
      );
    });

    it('throws StorageError for other S3 failures', async () => {
      mockSend.mockRejectedValueOnce(new Error('Internal error'));

      await expect(downloadDiagram('user-1', 'diagram-1')).rejects.toThrow(
        StorageError
      );
    });
  });

  describe('uploadExport', () => {
    it('uploads an export file with correct content type', async () => {
      mockSend.mockResolvedValueOnce({});
      const buffer = Buffer.from('PNG data');

      const key = await uploadExport('user-1', 'diagram-1', 'png', buffer);

      expect(key).toBe('diagrams/user-1/diagram-1/exports/diagram.png');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('throws FileSizeExceededError for oversized exports', async () => {
      const largeBuffer = Buffer.alloc(MAX_FILE_SIZE + 1);

      await expect(
        uploadExport('user-1', 'diagram-1', 'png', largeBuffer)
      ).rejects.toThrow(FileSizeExceededError);
    });
  });

  describe('uploadVersion', () => {
    it('uploads a version and returns the S3 key', async () => {
      mockSend.mockResolvedValueOnce({});

      const key = await uploadVersion(
        'user-1',
        'diagram-1',
        'version-abc',
        '<xml>v1</xml>'
      );

      expect(key).toBe(
        'diagrams/user-1/diagram-1/versions/version-abc.drawio'
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('throws FileSizeExceededError for oversized versions', async () => {
      const largeContent = 'x'.repeat(MAX_FILE_SIZE + 1);

      await expect(
        uploadVersion('user-1', 'diagram-1', 'v1', largeContent)
      ).rejects.toThrow(FileSizeExceededError);
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('generates a presigned download URL', async () => {
      const url = await getPresignedDownloadUrl(
        'diagrams/user-1/diagram-1/diagram.drawio'
      );

      expect(url).toBe('https://presigned-url.example.com');
      expect(getSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('throws StorageError when URL generation fails', async () => {
      vi.mocked(getSignedUrl).mockRejectedValueOnce(new Error('Signing error'));

      await expect(
        getPresignedDownloadUrl('some-key')
      ).rejects.toThrow(StorageError);
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('generates a presigned upload URL', async () => {
      const url = await getPresignedUploadUrl(
        'diagrams/user-1/diagram-1/diagram.drawio'
      );

      expect(url).toBe('https://presigned-url.example.com');
      expect(getSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('throws StorageError when URL generation fails', async () => {
      vi.mocked(getSignedUrl).mockRejectedValueOnce(new Error('Signing error'));

      await expect(
        getPresignedUploadUrl('some-key')
      ).rejects.toThrow(StorageError);
    });
  });

  describe('deleteDiagramFiles', () => {
    it('deletes all files under a diagram prefix', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'diagrams/user-1/diagram-1/diagram.drawio' },
            { Key: 'diagrams/user-1/diagram-1/exports/diagram.png' },
            { Key: 'diagrams/user-1/diagram-1/versions/v1.drawio' },
          ],
        })
        .mockResolvedValueOnce({}); // DeleteObjects response

      await expect(
        deleteDiagramFiles('user-1', 'diagram-1')
      ).resolves.toBeUndefined();

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('does nothing when no files exist', async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });

      await expect(
        deleteDiagramFiles('user-1', 'diagram-1')
      ).resolves.toBeUndefined();

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('throws StorageError when delete fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 error'));

      await expect(
        deleteDiagramFiles('user-1', 'diagram-1')
      ).rejects.toThrow(StorageError);
    });
  });

  describe('listDiagramExports', () => {
    it('returns export file metadata', async () => {
      const lastModified = new Date('2024-01-15T10:00:00Z');
      mockSend.mockResolvedValueOnce({
        Contents: [
          {
            Key: 'diagrams/user-1/diagram-1/exports/diagram.png',
            LastModified: lastModified,
            Size: 1024,
          },
          {
            Key: 'diagrams/user-1/diagram-1/exports/diagram.svg',
            LastModified: lastModified,
            Size: 2048,
          },
        ],
      });

      const exports = await listDiagramExports('user-1', 'diagram-1');

      expect(exports).toHaveLength(2);
      expect(exports[0]).toEqual({
        key: 'diagrams/user-1/diagram-1/exports/diagram.png',
        format: 'png',
        lastModified,
        size: 1024,
      });
      expect(exports[1]).toEqual({
        key: 'diagrams/user-1/diagram-1/exports/diagram.svg',
        format: 'svg',
        lastModified,
        size: 2048,
      });
    });

    it('returns empty array when no exports exist', async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });

      const exports = await listDiagramExports('user-1', 'diagram-1');

      expect(exports).toEqual([]);
    });

    it('throws StorageError when listing fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 error'));

      await expect(
        listDiagramExports('user-1', 'diagram-1')
      ).rejects.toThrow(StorageError);
    });
  });
});
