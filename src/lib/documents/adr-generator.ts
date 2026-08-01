/**
 * ADR (Architecture Decision Record) Generator
 *
 * Generates a Markdown ADR document from an architecture specification.
 * The ADR contains: title, status, context, decision, and consequences sections.
 *
 * Validates: Requirement 17.5
 */

import type { ArchitectureSpec } from '@/types/architecture';

/**
 * Generate an Architecture Decision Record (ADR) as Markdown.
 *
 * The ADR follows the standard format:
 * - Title: "ADR: {spec.name}"
 * - Status: "Accepted"
 * - Context: Describes the problem/need from the original prompt
 * - Decision: Summarizes the architecture chosen (services, patterns)
 * - Consequences: Positive and negative implications derived from analysis
 *
 * @param spec - The architecture specification to generate an ADR for
 * @returns Markdown string containing the full ADR document
 */
export function generateADR(spec: ArchitectureSpec): string {
  const lines: string[] = [];

  // Title section
  lines.push(`# ADR: ${spec.name}`);
  lines.push('');

  // Status section
  lines.push('## Status');
  lines.push('');
  lines.push('Accepted');
  lines.push('');

  // Context section - describes the problem/need from original prompt
  lines.push('## Context');
  lines.push('');
  lines.push(buildContextSection(spec));
  lines.push('');

  // Decision section - summarizes architecture chosen
  lines.push('## Decision');
  lines.push('');
  lines.push(buildDecisionSection(spec));
  lines.push('');

  // Consequences section - positive and negative implications
  lines.push('## Consequences');
  lines.push('');
  lines.push(buildConsequencesSection(spec));
  lines.push('');

  return lines.join('\n');
}

/**
 * Build the Context section from the architecture spec.
 * Derives context from the original prompt and description.
 */
function buildContextSection(spec: ArchitectureSpec): string {
  const parts: string[] = [];

  if (spec.metadata.prompt) {
    parts.push(
      `We need to design an AWS architecture to address the following requirement:`
    );
    parts.push('');
    parts.push(`> ${spec.metadata.prompt}`);
  } else {
    parts.push(spec.description);
  }

  parts.push('');
  parts.push(
    `This architecture targets the **${spec.region}** region and was generated on ${spec.metadata.generatedAt} using ${spec.metadata.llmModel}.`
  );

  return parts.join('\n');
}

/**
 * Build the Decision section summarizing the architecture chosen.
 * Lists services, patterns, and groupings.
 */
function buildDecisionSection(spec: ArchitectureSpec): string {
  const parts: string[] = [];

  parts.push(
    `We will implement the following architecture comprising ${spec.services.length} AWS service(s) and ${spec.connections.length} connection(s).`
  );
  parts.push('');

  // Summarize services by category
  const servicesByCategory = groupServicesByCategory(spec);
  if (Object.keys(servicesByCategory).length > 0) {
    parts.push('### Services');
    parts.push('');
    for (const [category, services] of Object.entries(servicesByCategory)) {
      parts.push(`**${category}:**`);
      for (const service of services) {
        const purpose = service.properties['purpose'] || service.properties['description'] || '';
        const suffix = purpose ? ` - ${purpose}` : '';
        parts.push(`- ${service.label} (\`${service.type}\`)${suffix}`);
      }
      parts.push('');
    }
  }

  // Summarize architectural patterns (groups)
  if (spec.groups.length > 0) {
    parts.push('### Architectural Patterns');
    parts.push('');
    for (const group of spec.groups) {
      const childCount = group.children.length;
      parts.push(
        `- **${group.label}** (${group.type}): Contains ${childCount} service(s)`
      );
    }
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Build the Consequences section with positive and negative implications.
 */
function buildConsequencesSection(spec: ArchitectureSpec): string {
  const parts: string[] = [];
  const positives = derivePositiveConsequences(spec);
  const negatives = deriveNegativeConsequences(spec);

  parts.push('### Positive');
  parts.push('');
  for (const positive of positives) {
    parts.push(`- ${positive}`);
  }
  parts.push('');

  parts.push('### Negative');
  parts.push('');
  for (const negative of negatives) {
    parts.push(`- ${negative}`);
  }

  return parts.join('\n');
}

/**
 * Group services by a derived category based on service type.
 */
function groupServicesByCategory(
  spec: ArchitectureSpec
): Record<string, typeof spec.services> {
  const categories: Record<string, typeof spec.services> = {};

  for (const service of spec.services) {
    const category = getCategoryForType(service.type);
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(service);
  }

  return categories;
}

/**
 * Map a service type to a high-level category name for display.
 */
function getCategoryForType(type: string): string {
  const categoryMap: Record<string, string> = {
    ec2: 'Compute',
    lambda: 'Compute',
    ecs: 'Compute',
    eks: 'Compute',
    fargate: 'Compute',
    'elastic-beanstalk': 'Compute',
    lightsail: 'Compute',
    batch: 'Compute',
    'app-runner': 'Compute',
    s3: 'Storage',
    ebs: 'Storage',
    efs: 'Storage',
    fsx: 'Storage',
    'storage-gateway': 'Storage',
    backup: 'Storage',
    rds: 'Database',
    aurora: 'Database',
    dynamodb: 'Database',
    elasticache: 'Database',
    redshift: 'Database',
    neptune: 'Database',
    documentdb: 'Database',
    memorydb: 'Database',
    timestream: 'Database',
    vpc: 'Networking',
    cloudfront: 'Networking',
    route53: 'Networking',
    'api-gateway': 'Networking',
    elb: 'Networking',
    alb: 'Networking',
    nlb: 'Networking',
    'nat-gateway': 'Networking',
    'transit-gateway': 'Networking',
    'global-accelerator': 'Networking',
    iam: 'Security',
    cognito: 'Security',
    waf: 'Security',
    shield: 'Security',
    kms: 'Security',
    'secrets-manager': 'Security',
    guardduty: 'Security',
    inspector: 'Security',
    sqs: 'Application Integration',
    sns: 'Application Integration',
    eventbridge: 'Application Integration',
    'step-functions': 'Application Integration',
    appsync: 'Application Integration',
    kinesis: 'Analytics',
    athena: 'Analytics',
    emr: 'Analytics',
    glue: 'Analytics',
    opensearch: 'Analytics',
    msk: 'Analytics',
    sagemaker: 'Machine Learning',
    bedrock: 'Machine Learning',
    rekognition: 'Machine Learning',
    cloudwatch: 'Management',
    cloudtrail: 'Management',
    config: 'Management',
    'systems-manager': 'Management',
    cloudformation: 'Management',
  };

  return categoryMap[type] || 'Other';
}

/**
 * Derive positive consequences from the architecture specification.
 */
function derivePositiveConsequences(spec: ArchitectureSpec): string[] {
  const positives: string[] = [];

  // Check for managed services
  const managedServices = spec.services.filter((s) =>
    ['lambda', 'fargate', 'dynamodb', 's3', 'sqs', 'sns', 'eventbridge', 'api-gateway', 'app-runner'].includes(s.type)
  );
  if (managedServices.length > 0) {
    positives.push(
      'Uses managed/serverless services reducing operational overhead'
    );
  }

  // Check for multi-AZ / HA patterns
  const hasMultiAz = spec.groups.some(
    (g) => g.type === 'availability-zone'
  );
  if (hasMultiAz) {
    positives.push(
      'Multi-AZ deployment improves availability and fault tolerance'
    );
  }

  // Check for security services
  const hasSecurityServices = spec.services.some((s) =>
    ['waf', 'shield', 'guardduty', 'kms', 'cognito', 'iam'].includes(s.type)
  );
  if (hasSecurityServices) {
    positives.push(
      'Includes security services for defense-in-depth'
    );
  }

  // Check for monitoring
  const hasMonitoring = spec.services.some((s) =>
    ['cloudwatch', 'cloudtrail', 'config'].includes(s.type)
  );
  if (hasMonitoring) {
    positives.push(
      'Observability and monitoring capabilities are included'
    );
  }

  // Check for networking patterns
  const hasVpc = spec.groups.some((g) => g.type === 'vpc');
  if (hasVpc) {
    positives.push('Network isolation via VPC provides a security boundary');
  }

  // Default positive if none derived
  if (positives.length === 0) {
    positives.push('Architecture leverages AWS managed services for reliability');
    positives.push('Standardized AWS components ease team onboarding');
  }

  return positives;
}

/**
 * Derive negative consequences from the architecture specification.
 */
function deriveNegativeConsequences(spec: ArchitectureSpec): string[] {
  const negatives: string[] = [];

  // Vendor lock-in concern for AWS-specific services
  const proprietaryServices = spec.services.filter((s) =>
    ['dynamodb', 'aurora', 'kinesis', 'step-functions', 'appsync', 'bedrock', 'sagemaker'].includes(s.type)
  );
  if (proprietaryServices.length > 0) {
    negatives.push(
      'Tight coupling to AWS-specific services increases vendor lock-in'
    );
  }

  // Complexity from many services
  if (spec.services.length > 10) {
    negatives.push(
      `Architecture involves ${spec.services.length} services which increases operational complexity`
    );
  }

  // Cost risk from multiple managed services
  if (spec.services.length > 5) {
    negatives.push(
      'Multiple managed services may result in higher costs at scale if not properly optimized'
    );
  }

  // Distributed system concerns
  if (spec.connections.length > spec.services.length) {
    negatives.push(
      'High number of inter-service connections increases debugging and latency concerns'
    );
  }

  // Default negatives if none derived
  if (negatives.length === 0) {
    negatives.push('Team needs AWS expertise to operate and maintain the architecture');
    negatives.push('Monthly operational costs for AWS services must be budgeted');
  }

  return negatives;
}
