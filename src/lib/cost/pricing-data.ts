/**
 * Static pricing data for AWS services used in cost estimation.
 *
 * Prices are approximate monthly costs based on default usage assumptions:
 * - 730 compute hours/month
 * - 1 million requests/month
 * - 100 GB data transfer/month
 * - 50 GB storage/month
 *
 * These are simplified estimates for architecture planning purposes.
 * Actual costs depend on region, usage patterns, and pricing tiers.
 */

import type { AWSServiceType } from '@/types/architecture';

/**
 * Pricing entry for a single AWS service type.
 */
export interface ServicePricingEntry {
  /** The AWS service type */
  type: AWSServiceType;
  /** Whether pricing data is available for this service */
  available: boolean;
  /** Base monthly cost in USD (at default assumptions) */
  baseMonthlyCost: number;
  /** Cost scaling factors for usage parameters */
  scaling: {
    /** Cost per additional compute hour beyond base */
    perComputeHour: number;
    /** Cost per million requests beyond base */
    perMillionRequests: number;
    /** Cost per GB of data transfer beyond base */
    perGBTransfer: number;
    /** Cost per GB of storage beyond base */
    perGBStorage: number;
  };
}

/**
 * Static pricing data map for all supported AWS service types.
 * Costs are approximate and based on us-east-1 public pricing.
 *
 * Services marked as `available: false` have complex or
 * unavailable pricing that cannot be reasonably estimated.
 */
export const PRICING_DATA: ReadonlyMap<AWSServiceType, ServicePricingEntry> = new Map([
  // ─── Compute ──────────────────────────────────────────────────────────────
  ['ec2', {
    type: 'ec2',
    available: true,
    baseMonthlyCost: 80.00, // t3.large, 730 hrs on-demand
    scaling: { perComputeHour: 0.1096, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],
  ['lambda', {
    type: 'lambda',
    available: true,
    baseMonthlyCost: 20.00, // 1M invocations, 128MB, 200ms avg
    scaling: { perComputeHour: 0, perMillionRequests: 0.20, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['ecs', {
    type: 'ecs',
    available: true,
    baseMonthlyCost: 70.00, // ~2 vCPU, 4GB
    scaling: { perComputeHour: 0.096, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['eks', {
    type: 'eks',
    available: true,
    baseMonthlyCost: 146.00, // $73 cluster fee + ~$73 nodes
    scaling: { perComputeHour: 0.10, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['fargate', {
    type: 'fargate',
    available: true,
    baseMonthlyCost: 85.00, // 1 vCPU, 2GB, 730 hrs
    scaling: { perComputeHour: 0.116, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['elastic-beanstalk', {
    type: 'elastic-beanstalk',
    available: true,
    baseMonthlyCost: 80.00, // No additional cost, uses underlying EC2
    scaling: { perComputeHour: 0.1096, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],
  ['lightsail', {
    type: 'lightsail',
    available: true,
    baseMonthlyCost: 10.00, // 1GB RAM, 1 vCPU
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],
  ['batch', {
    type: 'batch',
    available: true,
    baseMonthlyCost: 50.00, // Underlying compute costs
    scaling: { perComputeHour: 0.07, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['outposts', {
    type: 'outposts',
    available: false,
    baseMonthlyCost: 0,
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['app-runner', {
    type: 'app-runner',
    available: true,
    baseMonthlyCost: 25.00, // 1 vCPU, 2GB
    scaling: { perComputeHour: 0.064, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],

  // ─── Containers ─────────────────────────────────────────────────────────────
  ['ecr', {
    type: 'ecr',
    available: true,
    baseMonthlyCost: 5.00, // 50GB storage
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],

  // ─── Storage ────────────────────────────────────────────────────────────────
  ['s3', {
    type: 's3',
    available: true,
    baseMonthlyCost: 2.30, // 50GB standard storage + requests
    scaling: { perComputeHour: 0, perMillionRequests: 0.005, perGBTransfer: 0.09, perGBStorage: 0.023 },
  }],
  ['ebs', {
    type: 'ebs',
    available: true,
    baseMonthlyCost: 5.00, // 50GB gp3
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0.08 },
  }],
  ['efs', {
    type: 'efs',
    available: true,
    baseMonthlyCost: 15.00, // 50GB standard
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0.30 },
  }],
  ['fsx', {
    type: 'fsx',
    available: true,
    baseMonthlyCost: 60.00, // FSx for Lustre, 50GB
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0.14 },
  }],
  ['storage-gateway', {
    type: 'storage-gateway',
    available: true,
    baseMonthlyCost: 125.00, // Gateway instance + storage
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.023 },
  }],
  ['backup', {
    type: 'backup',
    available: true,
    baseMonthlyCost: 2.50, // 50GB warm storage
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0.05 },
  }],

  // ─── Databases ──────────────────────────────────────────────────────────────
  ['rds', {
    type: 'rds',
    available: true,
    baseMonthlyCost: 120.00, // db.t3.large, single-AZ
    scaling: { perComputeHour: 0.166, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.115 },
  }],
  ['aurora', {
    type: 'aurora',
    available: true,
    baseMonthlyCost: 180.00, // db.r5.large, single writer
    scaling: { perComputeHour: 0.246, perMillionRequests: 0.20, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],
  ['dynamodb', {
    type: 'dynamodb',
    available: true,
    baseMonthlyCost: 30.00, // On-demand, ~1M reads + 250K writes/mo
    scaling: { perComputeHour: 0, perMillionRequests: 1.25, perGBTransfer: 0.09, perGBStorage: 0.25 },
  }],
  ['elasticache', {
    type: 'elasticache',
    available: true,
    baseMonthlyCost: 50.00, // cache.t3.medium
    scaling: { perComputeHour: 0.068, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['redshift', {
    type: 'redshift',
    available: true,
    baseMonthlyCost: 180.00, // dc2.large, single node
    scaling: { perComputeHour: 0.25, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.024 },
  }],
  ['neptune', {
    type: 'neptune',
    available: true,
    baseMonthlyCost: 140.00, // db.t3.medium
    scaling: { perComputeHour: 0.192, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],
  ['documentdb', {
    type: 'documentdb',
    available: true,
    baseMonthlyCost: 140.00, // db.t3.medium
    scaling: { perComputeHour: 0.192, perMillionRequests: 0.20, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],
  ['keyspaces', {
    type: 'keyspaces',
    available: true,
    baseMonthlyCost: 35.00, // On-demand
    scaling: { perComputeHour: 0, perMillionRequests: 1.50, perGBTransfer: 0.09, perGBStorage: 0.25 },
  }],
  ['timestream', {
    type: 'timestream',
    available: true,
    baseMonthlyCost: 45.00, // Memory store + magnetic
    scaling: { perComputeHour: 0, perMillionRequests: 0.50, perGBTransfer: 0.09, perGBStorage: 0.03 },
  }],
  ['memorydb', {
    type: 'memorydb',
    available: true,
    baseMonthlyCost: 95.00, // db.t4g.medium
    scaling: { perComputeHour: 0.130, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.20 },
  }],

  // ─── Networking ─────────────────────────────────────────────────────────────
  ['vpc', {
    type: 'vpc',
    available: true,
    baseMonthlyCost: 0.00, // VPC itself is free
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['cloudfront', {
    type: 'cloudfront',
    available: true,
    baseMonthlyCost: 15.00, // 100GB transfer
    scaling: { perComputeHour: 0, perMillionRequests: 0.01, perGBTransfer: 0.085, perGBStorage: 0 },
  }],
  ['route53', {
    type: 'route53',
    available: true,
    baseMonthlyCost: 1.00, // 1 hosted zone + queries
    scaling: { perComputeHour: 0, perMillionRequests: 0.40, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['api-gateway', {
    type: 'api-gateway',
    available: true,
    baseMonthlyCost: 3.50, // REST API, 1M calls
    scaling: { perComputeHour: 0, perMillionRequests: 3.50, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['elb', {
    type: 'elb',
    available: true,
    baseMonthlyCost: 22.00, // Classic LB, 730 hrs
    scaling: { perComputeHour: 0.025, perMillionRequests: 0, perGBTransfer: 0.008, perGBStorage: 0 },
  }],
  ['alb', {
    type: 'alb',
    available: true,
    baseMonthlyCost: 25.00, // ALB fixed + LCU
    scaling: { perComputeHour: 0.0225, perMillionRequests: 0, perGBTransfer: 0.008, perGBStorage: 0 },
  }],
  ['nlb', {
    type: 'nlb',
    available: true,
    baseMonthlyCost: 25.00, // NLB fixed + NLCU
    scaling: { perComputeHour: 0.0225, perMillionRequests: 0, perGBTransfer: 0.006, perGBStorage: 0 },
  }],
  ['direct-connect', {
    type: 'direct-connect',
    available: true,
    baseMonthlyCost: 220.00, // 1 Gbps port
    scaling: { perComputeHour: 0.30, perMillionRequests: 0, perGBTransfer: 0.02, perGBStorage: 0 },
  }],
  ['transit-gateway', {
    type: 'transit-gateway',
    available: true,
    baseMonthlyCost: 40.00, // Per attachment + data processing
    scaling: { perComputeHour: 0.05, perMillionRequests: 0, perGBTransfer: 0.02, perGBStorage: 0 },
  }],
  ['global-accelerator', {
    type: 'global-accelerator',
    available: true,
    baseMonthlyCost: 20.00, // Fixed hourly + DT premium
    scaling: { perComputeHour: 0.025, perMillionRequests: 0, perGBTransfer: 0.015, perGBStorage: 0 },
  }],
  ['nat-gateway', {
    type: 'nat-gateway',
    available: true,
    baseMonthlyCost: 37.00, // 730 hrs + 100GB processing
    scaling: { perComputeHour: 0.045, perMillionRequests: 0, perGBTransfer: 0.045, perGBStorage: 0 },
  }],
  ['elastic-ip', {
    type: 'elastic-ip',
    available: true,
    baseMonthlyCost: 3.65, // Unused EIP cost
    scaling: { perComputeHour: 0.005, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],

  // ─── Security & Identity ────────────────────────────────────────────────────
  ['iam', {
    type: 'iam',
    available: true,
    baseMonthlyCost: 0.00, // IAM is free
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['cognito', {
    type: 'cognito',
    available: true,
    baseMonthlyCost: 5.50, // 1000 MAUs at $0.0055 each
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['waf', {
    type: 'waf',
    available: true,
    baseMonthlyCost: 11.00, // 1 web ACL + 5 rules + 1M requests
    scaling: { perComputeHour: 0, perMillionRequests: 0.60, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['shield', {
    type: 'shield',
    available: true,
    baseMonthlyCost: 3000.00, // Shield Advanced (standard is free)
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['kms', {
    type: 'kms',
    available: true,
    baseMonthlyCost: 1.00, // 1 CMK
    scaling: { perComputeHour: 0, perMillionRequests: 0.03, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['secrets-manager', {
    type: 'secrets-manager',
    available: true,
    baseMonthlyCost: 0.80, // 2 secrets
    scaling: { perComputeHour: 0, perMillionRequests: 0.05, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['certificate-manager', {
    type: 'certificate-manager',
    available: true,
    baseMonthlyCost: 0.00, // Public certs are free
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['guardduty', {
    type: 'guardduty',
    available: true,
    baseMonthlyCost: 4.00, // Per-account base analysis
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['inspector', {
    type: 'inspector',
    available: true,
    baseMonthlyCost: 1.50, // Per instance assessment
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['macie', {
    type: 'macie',
    available: true,
    baseMonthlyCost: 10.00, // Account + bucket inventory
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 1.00 },
  }],

  // ─── Application Integration ────────────────────────────────────────────────
  ['sqs', {
    type: 'sqs',
    available: true,
    baseMonthlyCost: 0.40, // 1M requests standard queue
    scaling: { perComputeHour: 0, perMillionRequests: 0.40, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['sns', {
    type: 'sns',
    available: true,
    baseMonthlyCost: 0.50, // 1M publishes
    scaling: { perComputeHour: 0, perMillionRequests: 0.50, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['eventbridge', {
    type: 'eventbridge',
    available: true,
    baseMonthlyCost: 1.00, // 1M events
    scaling: { perComputeHour: 0, perMillionRequests: 1.00, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['step-functions', {
    type: 'step-functions',
    available: true,
    baseMonthlyCost: 25.00, // 1M state transitions
    scaling: { perComputeHour: 0, perMillionRequests: 25.00, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['appsync', {
    type: 'appsync',
    available: true,
    baseMonthlyCost: 4.00, // 1M queries + mutations
    scaling: { perComputeHour: 0, perMillionRequests: 4.00, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['mq', {
    type: 'mq',
    available: true,
    baseMonthlyCost: 70.00, // mq.m5.large single-instance
    scaling: { perComputeHour: 0.096, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],

  // ─── Analytics ──────────────────────────────────────────────────────────────
  ['kinesis', {
    type: 'kinesis',
    available: true,
    baseMonthlyCost: 15.00, // 1 shard, 730 hrs
    scaling: { perComputeHour: 0.015, perMillionRequests: 0.014, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['athena', {
    type: 'athena',
    available: true,
    baseMonthlyCost: 5.00, // ~1TB scanned
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.005 },
  }],
  ['emr', {
    type: 'emr',
    available: true,
    baseMonthlyCost: 100.00, // m5.xlarge master + 2 core
    scaling: { perComputeHour: 0.138, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['glue', {
    type: 'glue',
    available: true,
    baseMonthlyCost: 15.00, // Crawler + catalog
    scaling: { perComputeHour: 0.44, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['quicksight', {
    type: 'quicksight',
    available: true,
    baseMonthlyCost: 24.00, // Enterprise, 1 author
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0.25 },
  }],
  ['opensearch', {
    type: 'opensearch',
    available: true,
    baseMonthlyCost: 90.00, // t3.medium.search, single node
    scaling: { perComputeHour: 0.124, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.135 },
  }],
  ['msk', {
    type: 'msk',
    available: true,
    baseMonthlyCost: 150.00, // kafka.m5.large, 2 brokers
    scaling: { perComputeHour: 0.21, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.10 },
  }],
  ['data-pipeline', {
    type: 'data-pipeline',
    available: true,
    baseMonthlyCost: 8.00, // Low-frequency activities
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],

  // ─── AI/ML ──────────────────────────────────────────────────────────────────
  ['sagemaker', {
    type: 'sagemaker',
    available: true,
    baseMonthlyCost: 55.00, // ml.t3.medium notebook + inference
    scaling: { perComputeHour: 0.075, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.14 },
  }],
  ['bedrock', {
    type: 'bedrock',
    available: true,
    baseMonthlyCost: 50.00, // ~1M input tokens, model-dependent
    scaling: { perComputeHour: 0, perMillionRequests: 30.00, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['rekognition', {
    type: 'rekognition',
    available: true,
    baseMonthlyCost: 10.00, // 10K images/mo
    scaling: { perComputeHour: 0, perMillionRequests: 1.00, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['comprehend', {
    type: 'comprehend',
    available: true,
    baseMonthlyCost: 15.00, // NLP requests
    scaling: { perComputeHour: 0, perMillionRequests: 1.50, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['lex', {
    type: 'lex',
    available: true,
    baseMonthlyCost: 7.50, // 10K text requests
    scaling: { perComputeHour: 0, perMillionRequests: 0.75, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['polly', {
    type: 'polly',
    available: true,
    baseMonthlyCost: 4.00, // 1M characters
    scaling: { perComputeHour: 0, perMillionRequests: 4.00, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['textract', {
    type: 'textract',
    available: true,
    baseMonthlyCost: 15.00, // 10K pages
    scaling: { perComputeHour: 0, perMillionRequests: 1.50, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['translate', {
    type: 'translate',
    available: true,
    baseMonthlyCost: 15.00, // 1M characters
    scaling: { perComputeHour: 0, perMillionRequests: 15.00, perGBTransfer: 0, perGBStorage: 0 },
  }],

  // ─── Management & Governance ────────────────────────────────────────────────
  ['cloudwatch', {
    type: 'cloudwatch',
    available: true,
    baseMonthlyCost: 10.00, // Metrics, logs, alarms
    scaling: { perComputeHour: 0, perMillionRequests: 0.30, perGBTransfer: 0, perGBStorage: 0.03 },
  }],
  ['cloudtrail', {
    type: 'cloudtrail',
    available: true,
    baseMonthlyCost: 2.00, // Management events (first trail free)
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['config', {
    type: 'config',
    available: true,
    baseMonthlyCost: 6.00, // Config rules + recordings
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['systems-manager', {
    type: 'systems-manager',
    available: true,
    baseMonthlyCost: 0.00, // Most features are free
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['cloudformation', {
    type: 'cloudformation',
    available: true,
    baseMonthlyCost: 0.00, // Free (pay for resources)
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['organizations', {
    type: 'organizations',
    available: true,
    baseMonthlyCost: 0.00, // Free
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['trusted-advisor', {
    type: 'trusted-advisor',
    available: true,
    baseMonthlyCost: 0.00, // Included with support plan
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],

  // ─── Developer Tools ────────────────────────────────────────────────────────
  ['codecommit', {
    type: 'codecommit',
    available: true,
    baseMonthlyCost: 1.00, // First 5 active users free
    scaling: { perComputeHour: 0, perMillionRequests: 0.001, perGBTransfer: 0, perGBStorage: 0.06 },
  }],
  ['codebuild', {
    type: 'codebuild',
    available: true,
    baseMonthlyCost: 10.00, // general1.small, ~100 min/mo
    scaling: { perComputeHour: 0.005, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['codedeploy', {
    type: 'codedeploy',
    available: true,
    baseMonthlyCost: 0.00, // Free for EC2/Lambda
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
  ['codepipeline', {
    type: 'codepipeline',
    available: true,
    baseMonthlyCost: 1.00, // $1 per active pipeline
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],

  // ─── Migration & Transfer ──────────────────────────────────────────────────
  ['dms', {
    type: 'dms',
    available: true,
    baseMonthlyCost: 55.00, // dms.t3.medium
    scaling: { perComputeHour: 0.076, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0.115 },
  }],
  ['datasync', {
    type: 'datasync',
    available: true,
    baseMonthlyCost: 12.50, // 100GB transferred
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0.0125, perGBStorage: 0 },
  }],
  ['transfer-family', {
    type: 'transfer-family',
    available: true,
    baseMonthlyCost: 36.00, // SFTP endpoint + data
    scaling: { perComputeHour: 0.30, perMillionRequests: 0, perGBTransfer: 0.04, perGBStorage: 0 },
  }],

  // ─── IoT ────────────────────────────────────────────────────────────────────
  ['iot-core', {
    type: 'iot-core',
    available: true,
    baseMonthlyCost: 8.00, // 1M messages
    scaling: { perComputeHour: 0, perMillionRequests: 1.00, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['iot-greengrass', {
    type: 'iot-greengrass',
    available: true,
    baseMonthlyCost: 2.00, // Per core device
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],

  // ─── Media ──────────────────────────────────────────────────────────────────
  ['mediaconvert', {
    type: 'mediaconvert',
    available: true,
    baseMonthlyCost: 15.00, // Basic tier, SD output
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0.09, perGBStorage: 0 },
  }],
  ['elemental', {
    type: 'elemental',
    available: false, // Complex pricing model
    baseMonthlyCost: 0,
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],

  // ─── Generic ────────────────────────────────────────────────────────────────
  ['generic', {
    type: 'generic',
    available: false, // Unknown service, cannot estimate
    baseMonthlyCost: 0,
    scaling: { perComputeHour: 0, perMillionRequests: 0, perGBTransfer: 0, perGBStorage: 0 },
  }],
]);

/**
 * Get pricing data for a specific AWS service type.
 * Returns undefined if the service type is not in the pricing database.
 */
export function getServicePricing(type: AWSServiceType): ServicePricingEntry | undefined {
  return PRICING_DATA.get(type);
}

/**
 * Check if pricing data is available for a given service type.
 */
export function isPricingAvailable(type: AWSServiceType): boolean {
  const entry = PRICING_DATA.get(type);
  return entry?.available ?? false;
}
