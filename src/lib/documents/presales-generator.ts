/**
 * Pre-Sales Document Generator
 *
 * Generates a Markdown pre-sales document from an architecture specification
 * and optional cost estimate. The document contains:
 * - Solution Overview
 * - Architecture Diagram reference
 * - AWS Services Used (table with name, purpose, role)
 * - Key Design Decisions
 * - Cost Estimate (if provided)
 *
 * Validates: Requirement 17.6
 */

import type { ArchitectureSpec } from '@/types/architecture';
import type { CostEstimate } from '@/types/cost';

/**
 * Generate a pre-sales document as Markdown.
 *
 * @param spec - The architecture specification
 * @param costEstimate - Optional cost estimate to include pricing section
 * @returns Markdown string containing the full pre-sales document
 */
export function generatePreSalesDoc(
  spec: ArchitectureSpec,
  costEstimate?: CostEstimate
): string {
  const lines: string[] = [];

  // Document title
  lines.push(`# ${spec.name} - Solution Proposal`);
  lines.push('');

  // Solution Overview section
  lines.push('## Solution Overview');
  lines.push('');
  lines.push(buildSolutionOverview(spec));
  lines.push('');

  // Architecture Diagram section
  lines.push('## Architecture Diagram');
  lines.push('');
  lines.push(buildArchitectureDiagramSection(spec));
  lines.push('');

  // AWS Services Used section (table)
  lines.push('## AWS Services Used');
  lines.push('');
  lines.push(buildServicesTable(spec));
  lines.push('');

  // Key Design Decisions section
  lines.push('## Key Design Decisions');
  lines.push('');
  lines.push(buildDesignDecisions(spec));
  lines.push('');

  // Cost Estimate section (if provided)
  if (costEstimate) {
    lines.push('## Cost Estimate');
    lines.push('');
    lines.push(buildCostSection(costEstimate));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Build the Solution Overview section.
 * Provides a high-level description of the solution.
 */
function buildSolutionOverview(spec: ArchitectureSpec): string {
  const parts: string[] = [];

  parts.push(spec.description);
  parts.push('');
  parts.push(
    `This solution is deployed in the **${spec.region}** AWS region and comprises **${spec.services.length}** AWS service(s) connected by **${spec.connections.length}** integration point(s).`
  );

  // Mention groups/architectural patterns
  if (spec.groups.length > 0) {
    const groupTypes = [...new Set(spec.groups.map((g) => g.type))];
    parts.push('');
    parts.push(
      `The architecture is organized using ${groupTypes.join(', ')} groupings for clear resource isolation and management.`
    );
  }

  return parts.join('\n');
}

/**
 * Build the Architecture Diagram section with a reference to the exported diagram.
 */
function buildArchitectureDiagramSection(spec: ArchitectureSpec): string {
  const parts: string[] = [];

  parts.push(
    `The architecture diagram for **${spec.name}** illustrates the complete solution topology including all AWS services, their connections, and resource groupings.`
  );
  parts.push('');
  parts.push(`![Architecture Diagram](./architecture-${spec.id}.drawio.png)`);
  parts.push('');
  parts.push(
    '*The diagram is available in editable Draw.io format (.drawio) and as high-resolution PNG/SVG exports.*'
  );

  return parts.join('\n');
}

/**
 * Build the AWS Services table with name, purpose, and role columns.
 */
function buildServicesTable(spec: ArchitectureSpec): string {
  const lines: string[] = [];

  lines.push('| Service | Purpose | Role in Architecture |');
  lines.push('|---------|---------|---------------------|');

  for (const service of spec.services) {
    const name = service.label;
    const purpose =
      service.properties['purpose'] ||
      service.properties['description'] ||
      getDefaultPurpose(service.type);
    const role = deriveServiceRole(service, spec);

    lines.push(`| ${name} | ${purpose} | ${role} |`);
  }

  return lines.join('\n');
}

/**
 * Build the Key Design Decisions section.
 * Explains why each major service/pattern was chosen.
 */
function buildDesignDecisions(spec: ArchitectureSpec): string {
  const parts: string[] = [];
  const decisions = deriveDesignDecisions(spec);

  for (let i = 0; i < decisions.length; i++) {
    parts.push(`${i + 1}. **${decisions[i].title}**`);
    parts.push(`   ${decisions[i].rationale}`);
    parts.push('');
  }

  if (decisions.length === 0) {
    parts.push(
      'The architecture follows AWS best practices with standard service selections for the given workload requirements.'
    );
  }

  return parts.join('\n');
}

/**
 * Build the Cost Estimate section with monthly breakdown.
 */
function buildCostSection(costEstimate: CostEstimate): string {
  const lines: string[] = [];

  lines.push(
    `**Estimated Monthly Cost: $${costEstimate.totalMonthlyCost.toFixed(2)} USD**`
  );
  lines.push('');

  // Cost breakdown table
  lines.push('| Service | Monthly Cost |');
  lines.push('|---------|-------------|');

  for (const serviceCost of costEstimate.services) {
    if (serviceCost.available) {
      lines.push(
        `| ${serviceCost.serviceName} | $${serviceCost.monthlyCost.toFixed(2)} |`
      );
    } else {
      lines.push(`| ${serviceCost.serviceName} | Estimate unavailable |`);
    }
  }

  lines.push('');

  // Assumptions
  lines.push('### Assumptions');
  lines.push('');
  lines.push(
    `- Compute: ${costEstimate.assumptions.computeHoursPerMonth} hours/month`
  );
  lines.push(
    `- Requests: ${formatNumber(costEstimate.assumptions.requestsPerMonth)}/month`
  );
  lines.push(
    `- Data Transfer: ${costEstimate.assumptions.dataTransferGB} GB/month`
  );
  lines.push(`- Storage: ${costEstimate.assumptions.storageGB} GB`);
  lines.push('');
  lines.push(
    '*Cost estimates are approximate and based on default usage assumptions. Actual costs may vary based on usage patterns.*'
  );

  return lines.join('\n');
}

/**
 * Get a default purpose description for a service type.
 */
function getDefaultPurpose(type: string): string {
  const purposeMap: Record<string, string> = {
    ec2: 'Virtual compute instances',
    lambda: 'Serverless compute functions',
    ecs: 'Container orchestration',
    eks: 'Kubernetes container management',
    fargate: 'Serverless container execution',
    s3: 'Object storage',
    ebs: 'Block storage volumes',
    efs: 'Managed file storage',
    rds: 'Managed relational database',
    aurora: 'High-performance relational database',
    dynamodb: 'NoSQL key-value database',
    elasticache: 'In-memory caching',
    redshift: 'Data warehouse',
    vpc: 'Virtual private network',
    cloudfront: 'Content delivery network',
    route53: 'DNS management',
    'api-gateway': 'API management and routing',
    alb: 'Application load balancing',
    nlb: 'Network load balancing',
    elb: 'Load balancing',
    'nat-gateway': 'Outbound internet access for private subnets',
    cognito: 'User authentication and authorization',
    waf: 'Web application firewall',
    kms: 'Encryption key management',
    'secrets-manager': 'Secrets and credential management',
    sqs: 'Message queuing',
    sns: 'Pub/sub messaging',
    eventbridge: 'Event routing and orchestration',
    'step-functions': 'Workflow orchestration',
    kinesis: 'Real-time data streaming',
    athena: 'Serverless SQL queries',
    glue: 'ETL and data integration',
    sagemaker: 'Machine learning model training and deployment',
    bedrock: 'Foundation model access',
    cloudwatch: 'Monitoring and observability',
    cloudtrail: 'API activity logging',
    codepipeline: 'CI/CD pipeline',
  };

  return purposeMap[type] || 'AWS managed service';
}

/**
 * Derive the role of a service within the architecture based on its connections.
 */
function deriveServiceRole(
  service: { id: string; label: string; type: string },
  spec: { connections: { sourceId: string; targetId: string }[] }
): string {
  const inbound = spec.connections.filter((c) => c.targetId === service.id);
  const outbound = spec.connections.filter((c) => c.sourceId === service.id);

  if (inbound.length === 0 && outbound.length > 0) {
    return 'Entry point / Source';
  }
  if (outbound.length === 0 && inbound.length > 0) {
    return 'Terminal / Sink';
  }
  if (inbound.length > 0 && outbound.length > 0) {
    return 'Processing / Middleware';
  }
  return 'Standalone component';
}

interface DesignDecision {
  title: string;
  rationale: string;
}

/**
 * Derive key design decisions based on patterns detected in the architecture.
 */
function deriveDesignDecisions(spec: ArchitectureSpec): DesignDecision[] {
  const decisions: DesignDecision[] = [];

  // Check for serverless pattern
  const serverlessServices = spec.services.filter((s) =>
    ['lambda', 'api-gateway', 'dynamodb', 's3', 'step-functions', 'fargate'].includes(s.type)
  );
  if (serverlessServices.length >= 2) {
    decisions.push({
      title: 'Serverless-First Architecture',
      rationale:
        'Chosen to minimize operational overhead, enable automatic scaling, and adopt a pay-per-use pricing model.',
    });
  }

  // Check for container pattern
  const containerServices = spec.services.filter((s) =>
    ['ecs', 'eks', 'fargate', 'ecr'].includes(s.type)
  );
  if (containerServices.length >= 1) {
    decisions.push({
      title: 'Containerized Workloads',
      rationale:
        'Containers provide portability, consistent environments, and efficient resource utilization across development and production.',
    });
  }

  // Check for managed database choice
  const dbServices = spec.services.filter((s) =>
    ['rds', 'aurora', 'dynamodb', 'elasticache', 'redshift', 'neptune', 'documentdb'].includes(s.type)
  );
  if (dbServices.length >= 1) {
    const dbNames = dbServices.map((s) => s.label).join(', ');
    decisions.push({
      title: 'Managed Database Services',
      rationale:
        `Selected ${dbNames} to eliminate database administration overhead, enable automated backups, and leverage built-in high availability.`,
    });
  }

  // Check for CDN / caching
  const hasCdn = spec.services.some((s) =>
    ['cloudfront', 'elasticache'].includes(s.type)
  );
  if (hasCdn) {
    decisions.push({
      title: 'Edge Caching and Content Delivery',
      rationale:
        'CloudFront/ElastiCache reduces latency for end users and offloads origin servers, improving performance and cost efficiency.',
    });
  }

  // Check for event-driven architecture
  const eventServices = spec.services.filter((s) =>
    ['sqs', 'sns', 'eventbridge', 'kinesis', 'msk'].includes(s.type)
  );
  if (eventServices.length >= 2) {
    decisions.push({
      title: 'Event-Driven Architecture',
      rationale:
        'Decoupled, asynchronous communication between services improves resilience, scalability, and allows independent service evolution.',
    });
  }

  // Check for security services
  const securityServices = spec.services.filter((s) =>
    ['waf', 'shield', 'cognito', 'guardduty', 'kms'].includes(s.type)
  );
  if (securityServices.length >= 2) {
    decisions.push({
      title: 'Defense-in-Depth Security',
      rationale:
        'Multiple security layers protect against diverse threat vectors, meeting compliance requirements and reducing attack surface.',
    });
  }

  // Check for VPC / networking isolation
  const hasVpc = spec.groups.some((g) => g.type === 'vpc');
  const hasSubnets = spec.groups.some((g) => g.type === 'subnet');
  if (hasVpc && hasSubnets) {
    decisions.push({
      title: 'Network Isolation with VPC and Subnets',
      rationale:
        'Private subnets isolate sensitive workloads from the internet, with controlled access through NAT gateways and security groups.',
    });
  }

  return decisions;
}

/**
 * Format a large number with commas for readability.
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}
