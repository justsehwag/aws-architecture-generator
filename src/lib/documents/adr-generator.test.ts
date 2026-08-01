/**
 * Unit tests for ADR Generator
 *
 * Validates: Requirement 17.5
 */

import { describe, it, expect } from 'vitest';
import { generateADR } from './adr-generator';
import type { ArchitectureSpec } from '@/types/architecture';

function createTestSpec(overrides?: Partial<ArchitectureSpec>): ArchitectureSpec {
  return {
    id: 'test-123',
    name: 'Three-Tier Web Application',
    description: 'A scalable web application with frontend, backend, and database layers.',
    region: 'us-east-1',
    services: [
      {
        id: 'svc-1',
        type: 'alb',
        label: 'Application Load Balancer',
        properties: { purpose: 'Distributes incoming traffic' },
      },
      {
        id: 'svc-2',
        type: 'ec2',
        label: 'Web Servers',
        properties: { purpose: 'Hosts the application' },
      },
      {
        id: 'svc-3',
        type: 'rds',
        label: 'PostgreSQL Database',
        properties: { purpose: 'Persistent data storage' },
      },
    ],
    connections: [
      { id: 'conn-1', sourceId: 'svc-1', targetId: 'svc-2', protocol: 'HTTPS' },
      { id: 'conn-2', sourceId: 'svc-2', targetId: 'svc-3', protocol: 'TCP', port: 5432 },
    ],
    groups: [
      {
        id: 'grp-1',
        type: 'vpc',
        label: 'Production VPC',
        children: ['svc-1', 'svc-2', 'svc-3'],
      },
    ],
    metadata: {
      prompt: 'Create a three-tier web application with load balancing and a PostgreSQL database',
      generatedAt: '2025-01-15T10:30:00Z',
      llmModel: 'claude-sonnet',
    },
    ...overrides,
  };
}

describe('generateADR', () => {
  it('should contain the title section with spec name', () => {
    const spec = createTestSpec();
    const adr = generateADR(spec);

    expect(adr).toContain('# ADR: Three-Tier Web Application');
  });

  it('should contain the status section with "Accepted"', () => {
    const spec = createTestSpec();
    const adr = generateADR(spec);

    expect(adr).toContain('## Status');
    expect(adr).toContain('Accepted');
  });

  it('should contain the context section with original prompt', () => {
    const spec = createTestSpec();
    const adr = generateADR(spec);

    expect(adr).toContain('## Context');
    expect(adr).toContain(spec.metadata.prompt);
  });

  it('should contain the decision section with services', () => {
    const spec = createTestSpec();
    const adr = generateADR(spec);

    expect(adr).toContain('## Decision');
    expect(adr).toContain('Application Load Balancer');
    expect(adr).toContain('Web Servers');
    expect(adr).toContain('PostgreSQL Database');
  });

  it('should contain the consequences section with positive and negative', () => {
    const spec = createTestSpec();
    const adr = generateADR(spec);

    expect(adr).toContain('## Consequences');
    expect(adr).toContain('### Positive');
    expect(adr).toContain('### Negative');
  });

  it('should mention VPC in consequences when VPC group is present', () => {
    const spec = createTestSpec();
    const adr = generateADR(spec);

    expect(adr).toContain('VPC');
  });

  it('should include region and generation metadata in context', () => {
    const spec = createTestSpec();
    const adr = generateADR(spec);

    expect(adr).toContain('us-east-1');
    expect(adr).toContain('claude-sonnet');
  });

  it('should handle spec with no groups', () => {
    const spec = createTestSpec({ groups: [] });
    const adr = generateADR(spec);

    expect(adr).toContain('# ADR:');
    expect(adr).toContain('## Status');
    expect(adr).toContain('## Context');
    expect(adr).toContain('## Decision');
    expect(adr).toContain('## Consequences');
  });

  it('should handle spec with no prompt', () => {
    const spec = createTestSpec({
      metadata: {
        prompt: '',
        generatedAt: '2025-01-15T10:30:00Z',
        llmModel: 'claude-sonnet',
      },
    });
    const adr = generateADR(spec);

    expect(adr).toContain('## Context');
    expect(adr).toContain(spec.description);
  });
});
