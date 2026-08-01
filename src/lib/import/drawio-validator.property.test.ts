/**
 * Property-based tests for the .drawio file validator.
 *
 * **Validates: Requirements 15.3, 15.4, 15.5**
 *
 * Property 31: For valid drawio XML, validateDrawioFile returns valid=true
 * Property 31 inverse (a): For random non-XML strings, validateDrawioFile returns valid=false with XML_PARSE_ERROR
 * Property 31 inverse (b): For valid XML without mxfile, returns valid=false with SCHEMA_ERROR
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateDrawioFile } from './drawio-validator';

/**
 * Arbitrary for generating valid .drawio XML content.
 * A valid drawio file has: <mxfile><diagram><mxGraphModel><root>...</root></mxGraphModel></diagram></mxfile>
 */
const validDrawioXmlArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z]/.test(s)),
  fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z]/.test(s)),
).map(([diagramName, pageName]) => {
  // Escape XML special characters in the names
  const safeDiagramName = diagramName.replace(/[<>&"']/g, '');
  const safePageName = pageName.replace(/[<>&"']/g, '');
  return `<mxfile>` +
    `<diagram name="${safePageName || 'Page1'}">` +
    `<mxGraphModel>` +
    `<root>` +
    `<mxCell id="0"/>` +
    `<mxCell id="1" parent="0"/>` +
    `</root>` +
    `</mxGraphModel>` +
    `</diagram>` +
    `</mxfile>`;
});

/**
 * Arbitrary for generating non-XML strings (don't start with '<' or are clearly not XML).
 */
const nonXmlStringArb = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => {
  const trimmed = s.trim();
  return trimmed.length > 0 && !trimmed.startsWith('<');
});

/**
 * Arbitrary for generating valid XML that is NOT a .drawio format (no mxfile root).
 */
const validXmlNotDrawioArb = fc.tuple(
  fc.constantFrom('html', 'svg', 'data', 'config', 'document', 'root'),
  fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z]/.test(s)),
).map(([rootTag, content]) => {
  const safeContent = content.replace(/[<>&]/g, '');
  return `<${rootTag}><child>${safeContent || 'content'}</child></${rootTag}>`;
});

describe('drawio-validator property tests', () => {
  it('Property 31: valid drawio XML returns valid=true', () => {
    fc.assert(
      fc.property(validDrawioXmlArb, (xml) => {
        const result = validateDrawioFile(xml);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 31 inverse: non-XML strings return valid=false with XML_PARSE_ERROR', () => {
    fc.assert(
      fc.property(nonXmlStringArb, (input) => {
        const result = validateDrawioFile(input);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errorType).toBe('XML_PARSE_ERROR');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 31 inverse: valid XML without mxfile returns valid=false with SCHEMA_ERROR', () => {
    fc.assert(
      fc.property(validXmlNotDrawioArb, (xml) => {
        const result = validateDrawioFile(xml);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errorType).toBe('SCHEMA_ERROR');
        }
      }),
      { numRuns: 100 }
    );
  });
});
