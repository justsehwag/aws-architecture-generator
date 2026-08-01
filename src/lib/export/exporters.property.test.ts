/**
 * Property-based tests for export format validation.
 *
 * **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**
 *
 * Property 11: For any supported format string, exportDiagram produces non-empty output.
 * Property 11 (inverse): For any string NOT in supported formats, isSupportedFormat returns false.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  exportDiagram,
  isSupportedFormat,
  SUPPORTED_FORMATS,
  type ExportFormat,
} from './exporters';
import type { ArchitectureSpec } from '@/types/architecture';

// Minimal valid architecture spec for export testing
const minimalSpec: ArchitectureSpec = {
  id: 'test-export-id',
  name: 'Export Test Arch',
  description: 'Test architecture for export property tests',
  region: 'us-east-1',
  services: [
    {
      id: 'svc-1',
      type: 'lambda',
      label: 'My Lambda',
      properties: {},
      position: { x: 100, y: 100 },
    },
    {
      id: 'svc-2',
      type: 's3',
      label: 'My S3 Bucket',
      properties: {},
      position: { x: 300, y: 100 },
    },
  ],
  connections: [
    {
      id: 'conn-1',
      sourceId: 'svc-1',
      targetId: 'svc-2',
      label: 'Stores data',
    },
  ],
  groups: [],
  metadata: {
    prompt: 'test prompt for export',
    generatedAt: new Date().toISOString(),
    llmModel: 'test-model',
  },
};

// Minimal valid drawio XML for testing
const sampleDrawioXml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile>
  <diagram name="Architecture">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="svc-1" value="My Lambda" vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="60" height="60" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

describe('Export format validation property tests', () => {
  it('Property 11: any supported format produces non-empty export output', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_FORMATS),
        (format: ExportFormat) => {
          const result = exportDiagram(format, sampleDrawioXml, minimalSpec);
          expect(result.buffer.length).toBeGreaterThan(0);
          expect(result.contentType).toBeTruthy();
          expect(result.fileExtension).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11 (inverse): strings not in SUPPORTED_FORMATS are identified as unsupported', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (s) => !SUPPORTED_FORMATS.includes(s as ExportFormat)
        ),
        (format) => {
          expect(isSupportedFormat(format)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: isSupportedFormat returns true for all SUPPORTED_FORMATS', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_FORMATS),
        (format) => {
          expect(isSupportedFormat(format)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
