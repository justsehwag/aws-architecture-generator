import { describe, it, expect } from 'vitest';
import {
  validateArchitectureSpec,
  parseAndValidateArchitectureSpec,
} from './schema-validator';
import { LLMParseError } from './types';

/**
 * A minimal valid ArchitectureSpec JSON for testing.
 */
const validSpec = {
  id: 'arch-001',
  name: 'Three-Tier Web App',
  description: 'A standard three-tier web application on AWS',
  region: 'us-east-1',
  services: [
    {
      id: 'svc-1',
      type: 'alb',
      label: 'Application Load Balancer',
      properties: {},
    },
    {
      id: 'svc-2',
      type: 'ec2',
      label: 'Web Server',
      properties: { instanceType: 't3.medium' },
      groupId: 'grp-1',
    },
    {
      id: 'svc-3',
      type: 'rds',
      label: 'PostgreSQL Database',
      properties: { engine: 'postgres' },
      groupId: 'grp-1',
    },
  ],
  connections: [
    {
      id: 'conn-1',
      sourceId: 'svc-1',
      targetId: 'svc-2',
      label: 'HTTP traffic',
      protocol: 'HTTPS',
      port: 443,
    },
    {
      id: 'conn-2',
      sourceId: 'svc-2',
      targetId: 'svc-3',
      label: 'Database queries',
      protocol: 'TCP',
      port: 5432,
    },
  ],
  groups: [
    {
      id: 'grp-1',
      type: 'vpc',
      label: 'Production VPC',
      children: ['svc-2', 'svc-3'],
    },
  ],
  metadata: {
    prompt: 'Create a three-tier web application with a load balancer',
    generatedAt: '2025-01-15T10:30:00.000Z',
    llmModel: 'gpt-4o',
  },
};

describe('validateArchitectureSpec', () => {
  it('should accept a valid ArchitectureSpec JSON string', () => {
    const result = validateArchitectureSpec(JSON.stringify(validSpec));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('arch-001');
      expect(result.data.services).toHaveLength(3);
      expect(result.data.connections).toHaveLength(2);
      expect(result.data.groups).toHaveLength(1);
    }
  });

  it('should strip markdown code fences and still parse', () => {
    const wrapped = '```json\n' + JSON.stringify(validSpec) + '\n```';
    const result = validateArchitectureSpec(wrapped);
    expect(result.success).toBe(true);
  });

  it('should reject non-JSON strings', () => {
    const result = validateArchitectureSpec('This is not JSON at all');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('not valid JSON');
    }
  });

  it('should reject JSON missing required fields', () => {
    const incomplete = { id: 'test', name: 'Test' };
    const result = validateArchitectureSpec(JSON.stringify(incomplete));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('should reject specs with empty services array', () => {
    const noServices = { ...validSpec, services: [] };
    const result = validateArchitectureSpec(JSON.stringify(noServices));
    expect(result.success).toBe(false);
  });

  it('should reject specs with invalid service type', () => {
    const badType = {
      ...validSpec,
      services: [
        { id: 'svc-1', type: 'not-a-real-service', label: 'Bad', properties: {} },
      ],
    };
    const result = validateArchitectureSpec(JSON.stringify(badType));
    expect(result.success).toBe(false);
  });

  it('should accept specs with generic service type', () => {
    const genericService = {
      ...validSpec,
      services: [
        { id: 'svc-1', type: 'generic', label: 'Custom Service', properties: {} },
      ],
      connections: [],
      groups: [],
    };
    const result = validateArchitectureSpec(JSON.stringify(genericService));
    expect(result.success).toBe(true);
  });

  it('should accept specs with optional fields omitted', () => {
    const minimal = {
      id: 'arch-min',
      name: 'Minimal',
      description: 'A minimal spec',
      region: 'eu-west-1',
      services: [
        { id: 'svc-1', type: 'lambda', label: 'Handler', properties: {} },
      ],
      connections: [],
      groups: [],
      metadata: {
        prompt: 'Create a simple Lambda function',
        generatedAt: '2025-01-15T10:30:00.000Z',
        llmModel: 'claude-sonnet-4-20250514',
      },
    };
    const result = validateArchitectureSpec(JSON.stringify(minimal));
    expect(result.success).toBe(true);
  });
});

describe('parseAndValidateArchitectureSpec', () => {
  it('should return typed ArchitectureSpec on valid input', () => {
    const spec = parseAndValidateArchitectureSpec(JSON.stringify(validSpec));
    expect(spec.id).toBe('arch-001');
    expect(spec.services[0].type).toBe('alb');
  });

  it('should throw LLMParseError on invalid input', () => {
    expect(() =>
      parseAndValidateArchitectureSpec('not json')
    ).toThrow(LLMParseError);
  });

  it('should include raw response in LLMParseError', () => {
    try {
      parseAndValidateArchitectureSpec('bad input');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMParseError);
      expect((error as LLMParseError).rawResponse).toBe('bad input');
    }
  });
});
