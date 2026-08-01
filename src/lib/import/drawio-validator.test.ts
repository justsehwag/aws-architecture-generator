/**
 * Tests for .drawio file validator
 *
 * Validates: Requirements 15.3, 15.4, 15.5
 */

import { describe, it, expect } from 'vitest';
import {
  validateDrawioFile,
  validateFileSize,
  validateXml,
  validateDrawioSchema,
  MAX_IMPORT_FILE_SIZE,
} from './drawio-validator';

// ─── Test Data ────────────────────────────────────────────────────────────────

const VALID_DRAWIO_INLINE = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2024-01-01T00:00:00.000Z" agent="test" version="21.0.0">
  <diagram id="test-diagram" name="Page-1">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="Lambda" style="shape=mxgraph.aws4.lambda" vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="78" height="78" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

const VALID_DRAWIO_COMPRESSED = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram id="test" name="Page-1">7VfBbptAEP0aruAFYpzUMjXqIVIiVe3Bhw1ML</diagram>
</mxfile>`;

const INVALID_XML = `This is not XML content at all`;

const VALID_XML_NOT_DRAWIO = `<?xml version="1.0" encoding="UTF-8"?>
<html>
  <body>
    <p>Hello, world!</p>
  </body>
</html>`;

const VALID_XML_MXFILE_NO_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
</mxfile>`;

const VALID_XML_MXFILE_EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram id="test" name="Page-1">
  </diagram>
</mxfile>`;

const MALFORMED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile>
  <diagram>
    <mxGraphModel>
      <root>
        <mxCell id="0"
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

// ─── validateFileSize ─────────────────────────────────────────────────────────

describe('validateFileSize', () => {
  it('should accept files under 10 MB', () => {
    const result = validateFileSize(1024 * 1024); // 1 MB
    expect(result.valid).toBe(true);
  });

  it('should accept files exactly at 10 MB', () => {
    const result = validateFileSize(MAX_IMPORT_FILE_SIZE);
    expect(result.valid).toBe(true);
  });

  it('should reject files over 10 MB', () => {
    const result = validateFileSize(MAX_IMPORT_FILE_SIZE + 1);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('SIZE_ERROR');
      expect(result.error).toContain('10 MB');
    }
  });

  it('should accept zero-byte files (size check only)', () => {
    const result = validateFileSize(0);
    expect(result.valid).toBe(true);
  });
});

// ─── validateXml ──────────────────────────────────────────────────────────────

describe('validateXml', () => {
  it('should accept well-formed XML', () => {
    const result = validateXml(VALID_DRAWIO_INLINE);
    expect(result.valid).toBe(true);
  });

  it('should reject non-XML content', () => {
    const result = validateXml(INVALID_XML);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('XML_PARSE_ERROR');
    }
  });

  it('should reject malformed XML', () => {
    const result = validateXml(MALFORMED_XML);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('XML_PARSE_ERROR');
    }
  });

  it('should reject empty content', () => {
    const result = validateXml('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('XML_PARSE_ERROR');
      expect(result.error).toContain('empty');
    }
  });

  it('should reject whitespace-only content', () => {
    const result = validateXml('   \n\t  ');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('XML_PARSE_ERROR');
    }
  });

  it('should accept any well-formed XML document', () => {
    const result = validateXml(VALID_XML_NOT_DRAWIO);
    expect(result.valid).toBe(true);
  });
});

// ─── validateDrawioSchema ─────────────────────────────────────────────────────

describe('validateDrawioSchema', () => {
  it('should accept a valid .drawio file with inline mxGraphModel', () => {
    const result = validateDrawioSchema(VALID_DRAWIO_INLINE);
    expect(result.valid).toBe(true);
  });

  it('should accept a valid .drawio file with compressed diagram content', () => {
    const result = validateDrawioSchema(VALID_DRAWIO_COMPRESSED);
    expect(result.valid).toBe(true);
  });

  it('should reject valid XML without <mxfile> root', () => {
    const result = validateDrawioSchema(VALID_XML_NOT_DRAWIO);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('SCHEMA_ERROR');
      expect(result.error).toContain('mxfile');
    }
  });

  it('should reject <mxfile> without <diagram> element', () => {
    const result = validateDrawioSchema(VALID_XML_MXFILE_NO_DIAGRAM);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('SCHEMA_ERROR');
      expect(result.error).toContain('diagram');
    }
  });

  it('should reject <diagram> with no content and no mxGraphModel', () => {
    const result = validateDrawioSchema(VALID_XML_MXFILE_EMPTY_DIAGRAM);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('SCHEMA_ERROR');
    }
  });
});

// ─── validateDrawioFile (full pipeline) ───────────────────────────────────────

describe('validateDrawioFile', () => {
  it('should accept a valid .drawio file', () => {
    const result = validateDrawioFile(VALID_DRAWIO_INLINE);
    expect(result.valid).toBe(true);
  });

  it('should reject oversized files with SIZE_ERROR', () => {
    // Pass explicit size that exceeds limit
    const result = validateDrawioFile(VALID_DRAWIO_INLINE, MAX_IMPORT_FILE_SIZE + 1);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('SIZE_ERROR');
    }
  });

  it('should reject non-XML content with XML_PARSE_ERROR', () => {
    const result = validateDrawioFile(INVALID_XML);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('XML_PARSE_ERROR');
    }
  });

  it('should reject valid XML that is not .drawio with SCHEMA_ERROR', () => {
    const result = validateDrawioFile(VALID_XML_NOT_DRAWIO);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorType).toBe('SCHEMA_ERROR');
    }
  });

  it('should accept .drawio file with compressed diagram content', () => {
    const result = validateDrawioFile(VALID_DRAWIO_COMPRESSED);
    expect(result.valid).toBe(true);
  });
});
