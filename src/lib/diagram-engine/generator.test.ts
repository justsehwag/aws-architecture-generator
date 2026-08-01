/**
 * Unit tests for the Diagram Engine Generator
 *
 * Validates:
 *   - Valid ArchitectureSpec → well-formed .drawio XML (Req 2.1)
 *   - Official AWS icons resolved from service registry (Req 2.2)
 *   - Resources grouped into containers (Req 2.3)
 *   - Unknown services rendered as generic nodes with annotation (Req 2.5)
 *   - Invalid input rejected with field-level errors (Req 2.7)
 */

import { describe, it, expect } from 'vitest';
import {
  generateDiagram,
  validateArchitectureSpec,
  DiagramGenerationError,
} from './generator';
import type { ArchitectureSpec } from '@/types/architecture';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function createMinimalSpec(overrides: Partial<ArchitectureSpec> = {}): ArchitectureSpec {
  return {
    id: 'test-arch-001',
    name: 'Test Architecture',
    description: 'A test architecture for unit testing',
    region: 'us-east-1',
    services: [
      {
        id: 'svc-lambda',
        type: 'lambda',
        label: 'API Handler',
        properties: { runtime: 'nodejs18.x' },
      },
      {
        id: 'svc-dynamodb',
        type: 'dynamodb',
        label: 'Users Table',
        properties: { tableClass: 'STANDARD' },
      },
    ],
    connections: [
      {
        id: 'conn-1',
        sourceId: 'svc-lambda',
        targetId: 'svc-dynamodb',
        label: 'Read/Write',
        protocol: 'HTTPS',
      },
    ],
    groups: [],
    metadata: {
      prompt: 'Create a serverless API',
      generatedAt: new Date().toISOString(),
      llmModel: 'gpt-5.5',
    },
    ...overrides,
  };
}

function createGroupedSpec(): ArchitectureSpec {
  return {
    id: 'test-arch-002',
    name: 'VPC Architecture',
    description: 'Architecture with VPC grouping',
    region: 'us-east-1',
    services: [
      {
        id: 'svc-ec2',
        type: 'ec2',
        label: 'Web Server',
        properties: { instanceType: 't3.large' },
        groupId: 'subnet-public',
      },
      {
        id: 'svc-rds',
        type: 'rds',
        label: 'Database',
        properties: { engine: 'postgres' },
        groupId: 'subnet-private',
      },
      {
        id: 'svc-alb',
        type: 'alb',
        label: 'Load Balancer',
        properties: {},
        groupId: 'subnet-public',
      },
    ],
    connections: [
      { id: 'conn-1', sourceId: 'svc-alb', targetId: 'svc-ec2', protocol: 'HTTP', port: 80 },
      { id: 'conn-2', sourceId: 'svc-ec2', targetId: 'svc-rds', protocol: 'TCP', port: 5432 },
    ],
    groups: [
      {
        id: 'vpc-main',
        type: 'vpc',
        label: 'Main VPC',
        children: [],
      },
      {
        id: 'subnet-public',
        type: 'subnet',
        label: 'Public Subnet',
        parentId: 'vpc-main',
        children: ['svc-ec2', 'svc-alb'],
      },
      {
        id: 'subnet-private',
        type: 'subnet',
        label: 'Private Subnet',
        parentId: 'vpc-main',
        children: ['svc-rds'],
      },
    ],
    metadata: {
      prompt: 'Create a 3-tier web app with VPC',
      generatedAt: new Date().toISOString(),
      llmModel: 'claude-sonnet',
    },
  };
}

// ─── Tests: Validation ────────────────────────────────────────────────────────

describe('validateArchitectureSpec', () => {
  it('returns no errors for a valid spec', () => {
    const spec = createMinimalSpec();
    const errors = validateArchitectureSpec(spec);
    expect(errors).toHaveLength(0);
  });

  it('returns error for null input', () => {
    const errors = validateArchitectureSpec(null);
    expect(errors).toContain('Input must be a non-null object');
  });

  it('returns error for missing id', () => {
    const spec = createMinimalSpec({ id: '' });
    const errors = validateArchitectureSpec(spec);
    expect(errors.some((e) => e.includes('id'))).toBe(true);
  });

  it('returns error for missing services array', () => {
    const spec = { id: 'x', name: 'x', connections: [], groups: [] };
    const errors = validateArchitectureSpec(spec);
    expect(errors.some((e) => e.includes('services'))).toBe(true);
  });

  it('returns error for service with missing type', () => {
    const spec = createMinimalSpec({
      services: [{ id: 'svc-1', type: '' as 'lambda', label: 'Test', properties: {} }],
    });
    const errors = validateArchitectureSpec(spec);
    expect(errors.some((e) => e.includes('type'))).toBe(true);
  });

  it('returns error for connection referencing non-existent service', () => {
    const spec = createMinimalSpec({
      connections: [
        { id: 'c1', sourceId: 'nonexistent', targetId: 'svc-lambda' },
      ],
    });
    const errors = validateArchitectureSpec(spec);
    expect(errors.some((e) => e.includes('nonexistent'))).toBe(true);
  });
});

// ─── Tests: Diagram Generation ────────────────────────────────────────────────

describe('generateDiagram', () => {
  it('produces well-formed .drawio XML with XML declaration', () => {
    const spec = createMinimalSpec();
    const { xml } = generateDiagram(spec);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<mxfile>');
    expect(xml).toContain('</mxfile>');
    expect(xml).toContain('<mxGraphModel>');
    expect(xml).toContain('</mxGraphModel>');
    expect(xml).toContain('<root>');
    expect(xml).toContain('</root>');
  });

  it('includes official AWS icon styles for known services', () => {
    const spec = createMinimalSpec();
    const { xml } = generateDiagram(spec);

    // Lambda icon
    expect(xml).toContain('mxgraph.aws4.lambda');
    // DynamoDB icon
    expect(xml).toContain('mxgraph.aws4.dynamodb');
  });

  it('renders unknown services as generic nodes with review annotation', () => {
    const spec = createMinimalSpec({
      services: [
        {
          id: 'svc-custom',
          type: 'generic',
          label: 'Custom Service',
          properties: {},
        },
      ],
      connections: [],
    });
    const { xml, warnings } = generateDiagram(spec);

    expect(xml).toContain('Review: Unrecognized service');
    expect(xml).toContain('general_AWS_cloud');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('Custom Service');
  });

  it('creates container cells for VPC and subnet groups', () => {
    const spec = createGroupedSpec();
    const { xml } = generateDiagram(spec);

    // VPC container
    expect(xml).toContain('Main VPC');
    expect(xml).toContain('fillColor=#E7F4E4');
    expect(xml).toContain('strokeColor=#248714');

    // Subnet containers
    expect(xml).toContain('Public Subnet');
    expect(xml).toContain('Private Subnet');
    expect(xml).toContain('fillColor=#EFF6FF');
    expect(xml).toContain('strokeColor=#147EB8');
  });

  it('nests service nodes inside their parent containers', () => {
    const spec = createGroupedSpec();
    const { xml } = generateDiagram(spec);

    // EC2 should have parent=subnet-public
    expect(xml).toContain('id="svc-ec2"');
    expect(xml).toContain('parent="subnet-public"');

    // RDS should have parent=subnet-private
    expect(xml).toContain('id="svc-rds"');
    expect(xml).toContain('parent="subnet-private"');
  });

  it('creates edge cells for connections', () => {
    const spec = createMinimalSpec();
    const { xml } = generateDiagram(spec);

    expect(xml).toContain('source="svc-lambda"');
    expect(xml).toContain('target="svc-dynamodb"');
    expect(xml).toContain('Read/Write');
  });

  it('creates labeled edges from protocol and port', () => {
    const spec = createGroupedSpec();
    const { xml } = generateDiagram(spec);

    expect(xml).toContain('HTTP:80');
    expect(xml).toContain('TCP:5432');
  });

  it('throws DiagramGenerationError for invalid input', () => {
    const invalidSpec = { id: '', name: '' } as unknown as ArchitectureSpec;
    expect(() => generateDiagram(invalidSpec)).toThrow(DiagramGenerationError);
  });

  it('supports horizontal layout orientation', () => {
    const spec = createMinimalSpec();
    const { xml } = generateDiagram(spec, { orientation: 'horizontal' });

    // Should still produce valid XML
    expect(xml).toContain('<mxfile>');
    expect(xml).toContain('mxgraph.aws4.lambda');
  });

  it('handles empty services array', () => {
    const spec = createMinimalSpec({ services: [], connections: [] });
    const { xml } = generateDiagram(spec);

    expect(xml).toContain('<mxfile>');
    expect(xml).toContain('<mxGraphModel>');
  });

  it('handles bidirectional connections', () => {
    const spec = createMinimalSpec({
      connections: [
        {
          id: 'conn-bi',
          sourceId: 'svc-lambda',
          targetId: 'svc-dynamodb',
          label: 'Sync',
          bidirectional: true,
        },
      ],
    });
    const { xml } = generateDiagram(spec);

    // Should have both forward and reverse edge
    expect(xml).toContain('id="conn-bi"');
    expect(xml).toContain('id="conn-bi-reverse"');
  });

  it('completes within 10 seconds for 50 services', () => {
    // Generate a spec with 50 services
    const services = Array.from({ length: 50 }, (_, i) => ({
      id: `svc-${i}`,
      type: 'lambda' as const,
      label: `Service ${i}`,
      properties: {},
    }));

    // Create connections between adjacent services
    const connections = Array.from({ length: 49 }, (_, i) => ({
      id: `conn-${i}`,
      sourceId: `svc-${i}`,
      targetId: `svc-${i + 1}`,
    }));

    const spec = createMinimalSpec({ services, connections });

    const start = performance.now();
    const { xml } = generateDiagram(spec);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10000); // Under 10 seconds
    expect(xml).toContain('<mxfile>');
  });
});
