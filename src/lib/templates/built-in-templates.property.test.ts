/**
 * Property-based tests for built-in architecture templates.
 *
 * **Validates: Requirements 5.1, 5.3**
 *
 * Property 12: Every template has description between 50-500 chars and at least 2 use cases
 * Property 13: There are at least 8 built-in templates
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BUILT_IN_TEMPLATES, getBuiltInTemplates } from './built-in-templates';

describe('built-in-templates property tests', () => {
  it('Property 12: every template has description between 50-500 chars and at least 2 use cases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: BUILT_IN_TEMPLATES.length - 1 }),
        (index) => {
          const template = BUILT_IN_TEMPLATES[index];

          // Description must be between 50 and 500 characters
          expect(template.description.length).toBeGreaterThanOrEqual(50);
          expect(template.description.length).toBeLessThanOrEqual(500);

          // Must have at least 2 use cases
          expect(template.useCases.length).toBeGreaterThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: there are at least 8 built-in templates', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const templates = getBuiltInTemplates();
          expect(templates.length).toBeGreaterThanOrEqual(8);
        }
      ),
      { numRuns: 100 }
    );
  });
});
