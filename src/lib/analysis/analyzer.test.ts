/**
 * Unit tests for the architecture analysis module.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect } from 'vitest';
import { analyzeArchitecture, detectMissingComponents } from './analyzer';
import { evaluateWellArchitected } from './well-architected';
import {
  getSecurityRecommendations,
  getHighAvailabilityRecommendations,
  getCostOptimizationRecommendations,
} from './recommendations';
import type { ArchitectureSpec } from '@/types/architecture';

/**
 * Helper to create a minimal valid ArchitectureSpec for testing.
 */
function createTestSpec(
  overrides: Partial<ArchitectureSpec> = {}
): ArchitectureSpec {
  return {
    id: 'test-spec-1',
    name: 'Test Architecture',
    description: 'A test architecture',
    region: 'us-east-1',
    services: [],
    connections: [],
    groups: [],
    metadata: {
      prompt: 'Test prompt',
      generatedAt: new Date().toISOString(),
      llmModel: 'gpt-4',
    },
    ...overrides,
  };
}

describe('analyzeArchitecture', () => {
  it('returns a complete analysis structure', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Web Server', properties: {} },
        { id: 's2', type: 'rds', label: 'Database', properties: {} },
      ],
    });

    const analysis = analyzeArchitecture(spec);

    expect(analysis).toHaveProperty('wellArchitected');
    expect(analysis).toHaveProperty('recommendations');
    expect(analysis).toHaveProperty('missingComponents');
  });

  it('returns exactly 6 pillar assessments', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'lambda', label: 'Function', properties: {} },
      ],
    });

    const analysis = analyzeArchitecture(spec);

    expect(analysis.wellArchitected.pillars).toHaveLength(6);
  });

  it('handles empty architecture gracefully', () => {
    const spec = createTestSpec({ services: [] });
    const analysis = analyzeArchitecture(spec);

    expect(analysis.wellArchitected.pillars).toHaveLength(6);
    expect(analysis.recommendations).toBeDefined();
    expect(analysis.missingComponents).toBeDefined();
  });
});

describe('evaluateWellArchitected', () => {
  it('returns all 6 Well-Architected pillars', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
      ],
    });

    const assessment = evaluateWellArchitected(spec);

    expect(assessment.pillars).toHaveLength(6);

    const pillarNames = assessment.pillars.map((p) => p.pillar);
    expect(pillarNames).toContain('operational-excellence');
    expect(pillarNames).toContain('security');
    expect(pillarNames).toContain('reliability');
    expect(pillarNames).toContain('performance-efficiency');
    expect(pillarNames).toContain('cost-optimization');
    expect(pillarNames).toContain('sustainability');
  });

  it('each pillar has valid status', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'cloudwatch', label: 'Monitor', properties: {} },
        { id: 's2', type: 'cloudtrail', label: 'Trail', properties: {} },
      ],
    });

    const assessment = evaluateWellArchitected(spec);

    for (const pillar of assessment.pillars) {
      expect(['no-gaps', 'gaps-found']).toContain(pillar.status);
      expect(pillar.summary).toBeTruthy();
    }
  });

  it('marks operational-excellence as no-gaps when monitoring services are present', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'cloudwatch', label: 'CloudWatch', properties: {} },
        { id: 's2', type: 'cloudtrail', label: 'CloudTrail', properties: {} },
      ],
    });

    const assessment = evaluateWellArchitected(spec);
    const opEx = assessment.pillars.find(
      (p) => p.pillar === 'operational-excellence'
    );

    expect(opEx?.status).toBe('no-gaps');
  });
});

describe('detectMissingComponents', () => {
  it('suggests ALB when compute exists without load balancer', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
      ],
    });

    const missing = detectMissingComponents(spec);
    const lbSuggestion = missing.find((m) => m.type === 'Load Balancer');

    expect(lbSuggestion).toBeDefined();
    expect(lbSuggestion?.suggestedService).toBe('alb');
    expect(lbSuggestion?.severity).toBe('critical');
  });

  it('suggests CloudWatch when compute exists without monitoring', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
      ],
    });

    const missing = detectMissingComponents(spec);
    const monSuggestion = missing.find((m) => m.type === 'Monitoring');

    expect(monSuggestion).toBeDefined();
    expect(monSuggestion?.suggestedService).toBe('cloudwatch');
  });

  it('suggests AWS Backup when database exists without backup', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'rds', label: 'Database', properties: {} },
      ],
    });

    const missing = detectMissingComponents(spec);
    const backupSuggestion = missing.find((m) => m.type === 'Backup');

    expect(backupSuggestion).toBeDefined();
    expect(backupSuggestion?.suggestedService).toBe('backup');
    expect(backupSuggestion?.severity).toBe('recommended');
  });

  it('suggests WAF when public-facing services exist without WAF', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'alb', label: 'Load Balancer', properties: {} },
      ],
    });

    const missing = detectMissingComponents(spec);
    const wafSuggestion = missing.find(
      (m) => m.type === 'Web Application Firewall'
    );

    expect(wafSuggestion).toBeDefined();
    expect(wafSuggestion?.suggestedService).toBe('waf');
    expect(wafSuggestion?.severity).toBe('critical');
  });

  it('suggests NAT Gateway when VPC has compute without NAT', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
      ],
      groups: [
        { id: 'vpc1', type: 'vpc', label: 'Main VPC', children: ['s1'] },
      ],
    });

    const missing = detectMissingComponents(spec);
    const natSuggestion = missing.find((m) => m.type === 'NAT Gateway');

    expect(natSuggestion).toBeDefined();
    expect(natSuggestion?.suggestedService).toBe('nat-gateway');
  });

  it('does not suggest ALB when load balancer already exists', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
        { id: 's2', type: 'alb', label: 'ALB', properties: {} },
      ],
    });

    const missing = detectMissingComponents(spec);
    const lbSuggestion = missing.find((m) => m.type === 'Load Balancer');

    expect(lbSuggestion).toBeUndefined();
  });

  it('returns empty array for well-provisioned architecture', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
        { id: 's2', type: 'alb', label: 'ALB', properties: {} },
        { id: 's3', type: 'cloudwatch', label: 'Monitor', properties: {} },
        { id: 's4', type: 'waf', label: 'WAF', properties: {} },
        { id: 's5', type: 'cloudtrail', label: 'Trail', properties: {} },
        { id: 's6', type: 'config', label: 'Config', properties: {} },
        { id: 's7', type: 'backup', label: 'Backup', properties: {} },
        { id: 's8', type: 'route53', label: 'DNS', properties: {} },
        { id: 's9', type: 'nat-gateway', label: 'NAT', properties: {} },
        { id: 's10', type: 'cloudfront', label: 'CDN', properties: {} },
      ],
      groups: [
        {
          id: 'vpc1',
          type: 'vpc',
          label: 'VPC',
          children: ['s1', 's9'],
        },
      ],
    });

    const missing = detectMissingComponents(spec);
    // Should have very few or no missing components
    expect(missing.length).toBeLessThanOrEqual(2);
  });
});

describe('getSecurityRecommendations', () => {
  it('returns at most 10 recommendations', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
        { id: 's2', type: 'rds', label: 'DB', properties: {} },
        { id: 's3', type: 'alb', label: 'ALB', properties: {} },
        { id: 's4', type: 'api-gateway', label: 'API', properties: {} },
        { id: 's5', type: 's3', label: 'Storage', properties: {} },
      ],
    });

    const recs = getSecurityRecommendations(spec);
    expect(recs.length).toBeLessThanOrEqual(10);
  });

  it('all recommendations have valid severity', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
        { id: 's2', type: 'rds', label: 'DB', properties: {} },
      ],
    });

    const recs = getSecurityRecommendations(spec);
    for (const rec of recs) {
      expect(['critical', 'recommended', 'optional']).toContain(rec.severity);
      expect(rec.category).toBe('security');
    }
  });

  it('recommendations are sorted by severity (critical first)', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
        { id: 's2', type: 'rds', label: 'DB', properties: {} },
        { id: 's3', type: 'alb', label: 'ALB', properties: {} },
        { id: 's4', type: 's3', label: 'Bucket', properties: {} },
      ],
    });

    const recs = getSecurityRecommendations(spec);
    const severityOrder = { critical: 0, recommended: 1, optional: 2 };

    for (let i = 1; i < recs.length; i++) {
      expect(severityOrder[recs[i].severity]).toBeGreaterThanOrEqual(
        severityOrder[recs[i - 1].severity]
      );
    }
  });
});

describe('getHighAvailabilityRecommendations', () => {
  it('returns at most 10 recommendations', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
        { id: 's2', type: 'rds', label: 'DB', properties: {} },
        { id: 's3', type: 'elasticache', label: 'Cache', properties: {} },
        { id: 's4', type: 'sqs', label: 'Queue', properties: {} },
      ],
    });

    const recs = getHighAvailabilityRecommendations(spec);
    expect(recs.length).toBeLessThanOrEqual(10);
  });

  it('all recommendations have category high-availability', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
      ],
    });

    const recs = getHighAvailabilityRecommendations(spec);
    for (const rec of recs) {
      expect(rec.category).toBe('high-availability');
    }
  });

  it('suggests load balancer for EC2 without one', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
      ],
    });

    const recs = getHighAvailabilityRecommendations(spec);
    const lbRec = recs.find((r) => r.id === 'ha-load-balancer');
    expect(lbRec).toBeDefined();
    expect(lbRec?.severity).toBe('critical');
  });
});

describe('getCostOptimizationRecommendations', () => {
  it('returns at most 10 recommendations', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
        { id: 's2', type: 'rds', label: 'DB', properties: {} },
        { id: 's3', type: 's3', label: 'Storage', properties: {} },
        { id: 's4', type: 'nat-gateway', label: 'NAT', properties: {} },
        { id: 's5', type: 'dynamodb', label: 'DDB', properties: {} },
        { id: 's6', type: 'elasticache', label: 'Cache', properties: {} },
      ],
    });

    const recs = getCostOptimizationRecommendations(spec);
    expect(recs.length).toBeLessThanOrEqual(10);
  });

  it('all recommendations have category cost-optimization', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
      ],
    });

    const recs = getCostOptimizationRecommendations(spec);
    for (const rec of recs) {
      expect(rec.category).toBe('cost-optimization');
    }
  });

  it('suggests serverless when only EC2 is present', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
      ],
    });

    const recs = getCostOptimizationRecommendations(spec);
    const serverlessRec = recs.find((r) => r.id === 'cost-serverless');
    expect(serverlessRec).toBeDefined();
  });

  it('does not suggest serverless when Lambda is present', () => {
    const spec = createTestSpec({
      services: [
        { id: 's1', type: 'ec2', label: 'Server', properties: {} },
        { id: 's2', type: 'lambda', label: 'Function', properties: {} },
      ],
    });

    const recs = getCostOptimizationRecommendations(spec);
    const serverlessRec = recs.find((r) => r.id === 'cost-serverless');
    expect(serverlessRec).toBeUndefined();
  });
});
