/**
 * Unit tests for the explanation generator.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect } from 'vitest';
import { generateExplanation } from './explanation-generator';
import type { ArchitectureSpec } from '@/types/architecture';

function createTestSpec(overrides: Partial<ArchitectureSpec> = {}): ArchitectureSpec {
  return {
    id: 'test-123',
    name: 'Test Architecture',
    description: 'A test architecture for unit testing.',
    region: 'us-east-1',
    services: [],
    connections: [],
    groups: [],
    metadata: {
      prompt: 'Create a test architecture',
      generatedAt: '2025-01-01T00:00:00Z',
      llmModel: 'gpt-4',
    },
    ...overrides,
  };
}

describe('generateExplanation', () => {
  describe('plain-language summary (Requirement 8.1)', () => {
    it('should produce a summary for an empty architecture', () => {
      const spec = createTestSpec();
      const result = generateExplanation(spec);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain('does not contain any AWS services');
    });

    it('should produce a summary mentioning the architecture name and region', () => {
      const spec = createTestSpec({
        services: [
          {
            id: 'svc-1',
            type: 'lambda',
            label: 'API Handler',
            properties: {},
          },
        ],
      });
      const result = generateExplanation(spec);

      expect(result.summary).toContain('Test Architecture');
      expect(result.summary).toContain('us-east-1');
    });

    it('should expand acronyms on first use (no undefined acronyms)', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'vpc', label: 'Main VPC', properties: {} },
          { id: 'svc-2', type: 'ec2', label: 'Web Server', properties: {} },
        ],
        groups: [
          {
            id: 'g1',
            type: 'vpc',
            label: 'Production VPC',
            children: ['svc-1', 'svc-2'],
          },
        ],
      });
      const result = generateExplanation(spec);

      // VPC should be expanded on first use
      expect(result.summary).toContain('Virtual Private Cloud (VPC)');
    });

    it('should describe services by category', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'lambda', label: 'API Handler', properties: {} },
          { id: 'svc-2', type: 's3', label: 'File Storage', properties: {} },
        ],
      });
      const result = generateExplanation(spec);

      expect(result.summary).toContain('Compute');
      expect(result.summary).toContain('Storage');
    });
  });

  describe('service summary table (Requirement 8.2)', () => {
    it('should produce one row per service', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'lambda', label: 'API Handler', properties: {} },
          { id: 'svc-2', type: 's3', label: 'File Storage', properties: {} },
          { id: 'svc-3', type: 'dynamodb', label: 'Users Table', properties: {} },
        ],
      });
      const result = generateExplanation(spec);

      expect(result.serviceDescriptions).toHaveLength(3);
    });

    it('should include service name, purpose, and connections for each row', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'lambda', label: 'API Handler', properties: {} },
          { id: 'svc-2', type: 'dynamodb', label: 'Users Table', properties: {} },
        ],
        connections: [
          {
            id: 'conn-1',
            sourceId: 'svc-1',
            targetId: 'svc-2',
            label: 'read/write',
          },
        ],
      });
      const result = generateExplanation(spec);

      // First service - Lambda
      const lambdaRow = result.serviceDescriptions.find(
        (d) => d.serviceName === 'AWS Lambda'
      );
      expect(lambdaRow).toBeDefined();
      expect(lambdaRow!.purpose).toBeTruthy();
      expect(lambdaRow!.connections).toContain('Amazon DynamoDB (read/write)');

      // Second service - DynamoDB
      const dynamoRow = result.serviceDescriptions.find(
        (d) => d.serviceName === 'Amazon DynamoDB'
      );
      expect(dynamoRow).toBeDefined();
      expect(dynamoRow!.purpose).toBeTruthy();
      expect(dynamoRow!.connections).toContain('AWS Lambda (read/write)');
    });

    it('should list "None" for services with no connections', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'cloudwatch', label: 'Monitoring', properties: {} },
        ],
      });
      const result = generateExplanation(spec);

      expect(result.serviceDescriptions[0].connections).toEqual(['None']);
    });

    it('should produce an empty table for architecture with no services', () => {
      const spec = createTestSpec();
      const result = generateExplanation(spec);

      expect(result.serviceDescriptions).toHaveLength(0);
    });
  });

  describe('best practice recommendations (Requirement 8.3)', () => {
    it('should produce at most 10 recommendations', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'ec2', label: 'Server', properties: {} },
          { id: 'svc-2', type: 's3', label: 'Storage', properties: {} },
          { id: 'svc-3', type: 'rds', label: 'Database', properties: {} },
          { id: 'svc-4', type: 'alb', label: 'Load Balancer', properties: {} },
          { id: 'svc-5', type: 'api-gateway', label: 'API', properties: {} },
          { id: 'svc-6', type: 'dynamodb', label: 'NoSQL', properties: {} },
        ],
      });
      const result = generateExplanation(spec);

      expect(result.bestPractices.length).toBeGreaterThan(0);
      expect(result.bestPractices.length).toBeLessThanOrEqual(10);
    });

    it('should produce recommendations aligned to Well-Architected Framework', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'ec2', label: 'Web Server', properties: {} },
          { id: 'svc-2', type: 'rds', label: 'Database', properties: {} },
        ],
      });
      const result = generateExplanation(spec);

      // Should have recommendations
      expect(result.bestPractices.length).toBeGreaterThan(0);
      // Recommendations should be non-empty strings
      for (const rec of result.bestPractices) {
        expect(rec.length).toBeGreaterThan(0);
      }
    });

    it('should recommend CloudWatch when no monitoring service is present', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'lambda', label: 'Handler', properties: {} },
        ],
      });
      const result = generateExplanation(spec);

      const hasCloudWatchRec = result.bestPractices.some(
        (rec) => rec.toLowerCase().includes('cloudwatch')
      );
      expect(hasCloudWatchRec).toBe(true);
    });

    it('should recommend WAF for public-facing endpoints without WAF', () => {
      const spec = createTestSpec({
        services: [
          { id: 'svc-1', type: 'alb', label: 'Load Balancer', properties: {} },
          { id: 'svc-2', type: 'ec2', label: 'Web Server', properties: {} },
        ],
      });
      const result = generateExplanation(spec);

      const hasWafRec = result.bestPractices.some(
        (rec) => rec.toLowerCase().includes('waf') || rec.toLowerCase().includes('web application firewall')
      );
      expect(hasWafRec).toBe(true);
    });

    it('should produce empty recommendations for an empty architecture', () => {
      const spec = createTestSpec();
      const result = generateExplanation(spec);

      expect(result.bestPractices).toHaveLength(0);
    });
  });

  describe('performance (Requirement 8.4)', () => {
    it('should generate explanation within 5 seconds for up to 50 services', () => {
      // Create a spec with 50 services
      const services = Array.from({ length: 50 }, (_, i) => ({
        id: `svc-${i}`,
        type: i % 2 === 0 ? 'lambda' as const : 'dynamodb' as const,
        label: `Service ${i}`,
        properties: {},
      }));

      const connections = Array.from({ length: 25 }, (_, i) => ({
        id: `conn-${i}`,
        sourceId: `svc-${i * 2}`,
        targetId: `svc-${i * 2 + 1}`,
        label: 'connects to',
      }));

      const spec = createTestSpec({ services, connections });

      const start = performance.now();
      const result = generateExplanation(spec);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5000);
      expect(result.summary).toBeTruthy();
      expect(result.serviceDescriptions).toHaveLength(50);
    });
  });
});
