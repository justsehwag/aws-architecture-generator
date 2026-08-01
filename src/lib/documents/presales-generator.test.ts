/**
 * Unit tests for Pre-Sales Document Generator
 *
 * Validates: Requirement 17.6
 */

import { describe, it, expect } from 'vitest';
import { generatePreSalesDoc } from './presales-generator';
import type { ArchitectureSpec } from '@/types/architecture';
import type { CostEstimate } from '@/types/cost';

function createTestSpec(overrides?: Partial<ArchitectureSpec>): ArchitectureSpec {
  return {
    id: 'test-456',
    name: 'Serverless API Platform',
    description: 'A serverless API platform using Lambda and API Gateway for high scalability.',
    region: 'eu-west-1',
    services: [
      {
        id: 'svc-1',
        type: 'api-gateway',
        label: 'API Gateway',
        properties: { purpose: 'API routing and management' },
      },
      {
        id: 'svc-2',
        type: 'lambda',
        label: 'Business Logic Functions',
        properties: { purpose: 'Serverless compute for business logic' },
      },
      {
        id: 'svc-3',
        type: 'dynamodb',
        label: 'Data Store',
        properties: { purpose: 'NoSQL data persistence' },
      },
      {
        id: 'svc-4',
        type: 'cognito',
        label: 'Authentication',
        properties: { purpose: 'User identity and access management' },
      },
    ],
    connections: [
      { id: 'conn-1', sourceId: 'svc-1', targetId: 'svc-2', protocol: 'HTTPS' },
      { id: 'conn-2', sourceId: 'svc-2', targetId: 'svc-3', protocol: 'HTTPS' },
      { id: 'conn-3', sourceId: 'svc-1', targetId: 'svc-4', protocol: 'HTTPS' },
    ],
    groups: [],
    metadata: {
      prompt: 'Build a serverless API platform with authentication',
      generatedAt: '2025-01-15T10:30:00Z',
      llmModel: 'gpt-5.5',
    },
    ...overrides,
  };
}

function createTestCostEstimate(): CostEstimate {
  return {
    totalMonthlyCost: 125.50,
    services: [
      {
        serviceId: 'svc-1',
        serviceName: 'API Gateway',
        serviceType: 'api-gateway',
        monthlyCost: 35.00,
        available: true,
      },
      {
        serviceId: 'svc-2',
        serviceName: 'Lambda Functions',
        serviceType: 'lambda',
        monthlyCost: 45.50,
        available: true,
      },
      {
        serviceId: 'svc-3',
        serviceName: 'DynamoDB',
        serviceType: 'dynamodb',
        monthlyCost: 25.00,
        available: true,
      },
      {
        serviceId: 'svc-4',
        serviceName: 'Cognito',
        serviceType: 'cognito',
        monthlyCost: 20.00,
        available: true,
      },
    ],
    assumptions: {
      computeHoursPerMonth: 730,
      requestsPerMonth: 1_000_000,
      dataTransferGB: 100,
      storageGB: 50,
    },
  };
}

describe('generatePreSalesDoc', () => {
  it('should contain the solution overview section', () => {
    const spec = createTestSpec();
    const doc = generatePreSalesDoc(spec);

    expect(doc).toContain('## Solution Overview');
    expect(doc).toContain(spec.description);
  });

  it('should contain the architecture diagram section', () => {
    const spec = createTestSpec();
    const doc = generatePreSalesDoc(spec);

    expect(doc).toContain('## Architecture Diagram');
    expect(doc).toContain(`architecture-${spec.id}.drawio.png`);
  });

  it('should contain the AWS services table with name, purpose, and role', () => {
    const spec = createTestSpec();
    const doc = generatePreSalesDoc(spec);

    expect(doc).toContain('## AWS Services Used');
    expect(doc).toContain('| Service | Purpose | Role in Architecture |');
    expect(doc).toContain('API Gateway');
    expect(doc).toContain('Business Logic Functions');
    expect(doc).toContain('Data Store');
    expect(doc).toContain('Authentication');
  });

  it('should contain the key design decisions section', () => {
    const spec = createTestSpec();
    const doc = generatePreSalesDoc(spec);

    expect(doc).toContain('## Key Design Decisions');
    // Should detect serverless pattern
    expect(doc).toContain('Serverless');
  });

  it('should include cost estimate section when provided', () => {
    const spec = createTestSpec();
    const cost = createTestCostEstimate();
    const doc = generatePreSalesDoc(spec, cost);

    expect(doc).toContain('## Cost Estimate');
    expect(doc).toContain('$125.50');
    expect(doc).toContain('API Gateway');
    expect(doc).toContain('$35.00');
    expect(doc).toContain('$45.50');
  });

  it('should not include cost section when no estimate provided', () => {
    const spec = createTestSpec();
    const doc = generatePreSalesDoc(spec);

    expect(doc).not.toContain('## Cost Estimate');
  });

  it('should show service role based on connections', () => {
    const spec = createTestSpec();
    const doc = generatePreSalesDoc(spec);

    // API Gateway has only outbound connections → Entry point
    expect(doc).toContain('Entry point');
    // DynamoDB has only inbound connections → Terminal
    expect(doc).toContain('Terminal');
  });

  it('should handle unavailable pricing in cost section', () => {
    const spec = createTestSpec();
    const cost: CostEstimate = {
      totalMonthlyCost: 80.50,
      services: [
        {
          serviceId: 'svc-1',
          serviceName: 'API Gateway',
          serviceType: 'api-gateway',
          monthlyCost: 35.00,
          available: true,
        },
        {
          serviceId: 'svc-2',
          serviceName: 'Custom Service',
          serviceType: 'generic',
          monthlyCost: 0,
          available: false,
        },
      ],
      assumptions: {
        computeHoursPerMonth: 730,
        requestsPerMonth: 1_000_000,
        dataTransferGB: 100,
        storageGB: 50,
      },
    };
    const doc = generatePreSalesDoc(spec, cost);

    expect(doc).toContain('Estimate unavailable');
  });

  it('should include region information in overview', () => {
    const spec = createTestSpec();
    const doc = generatePreSalesDoc(spec);

    expect(doc).toContain('eu-west-1');
  });
});
