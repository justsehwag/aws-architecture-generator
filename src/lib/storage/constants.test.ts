import { describe, it, expect } from 'vitest';
import {
  MAX_FILE_SIZE,
  PRESIGNED_URL_EXPIRY,
  getDiagramKey,
  getExportKey,
  getVersionKey,
  getTemplateKey,
  getCustomTemplateKey,
} from './constants';

describe('Storage Constants', () => {
  it('MAX_FILE_SIZE should be 50 MB', () => {
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    expect(MAX_FILE_SIZE).toBe(52_428_800);
  });

  it('PRESIGNED_URL_EXPIRY should be 1 hour (3600 seconds)', () => {
    expect(PRESIGNED_URL_EXPIRY).toBe(3600);
  });
});

describe('Path Builders', () => {
  describe('getDiagramKey', () => {
    it('builds correct path for a diagram', () => {
      const key = getDiagramKey('user-123', 'diagram-456');
      expect(key).toBe('diagrams/user-123/diagram-456/diagram.drawio');
    });

    it('handles various user and diagram ID formats', () => {
      expect(getDiagramKey('abc', 'xyz')).toBe(
        'diagrams/abc/xyz/diagram.drawio'
      );
      expect(getDiagramKey('user_with_underscores', 'uuid-1234-5678')).toBe(
        'diagrams/user_with_underscores/uuid-1234-5678/diagram.drawio'
      );
    });
  });

  describe('getExportKey', () => {
    it('builds correct path for a PNG export', () => {
      const key = getExportKey('user-123', 'diagram-456', 'png');
      expect(key).toBe(
        'diagrams/user-123/diagram-456/exports/diagram.png'
      );
    });

    it('builds correct path for various formats', () => {
      expect(getExportKey('u1', 'd1', 'svg')).toBe(
        'diagrams/u1/d1/exports/diagram.svg'
      );
      expect(getExportKey('u1', 'd1', 'pdf')).toBe(
        'diagrams/u1/d1/exports/diagram.pdf'
      );
      expect(getExportKey('u1', 'd1', 'json')).toBe(
        'diagrams/u1/d1/exports/diagram.json'
      );
    });
  });

  describe('getVersionKey', () => {
    it('builds correct path for a version', () => {
      const key = getVersionKey('user-123', 'diagram-456', 'version-789');
      expect(key).toBe(
        'diagrams/user-123/diagram-456/versions/version-789.drawio'
      );
    });
  });

  describe('getTemplateKey', () => {
    it('builds correct path for a built-in template', () => {
      const key = getTemplateKey('three-tier-web');
      expect(key).toBe('templates/built-in/three-tier-web.drawio');
    });
  });

  describe('getCustomTemplateKey', () => {
    it('builds correct path for a custom template', () => {
      const key = getCustomTemplateKey('user-123', 'template-456');
      expect(key).toBe(
        'templates/custom/user-123/template-456.drawio'
      );
    });
  });
});
