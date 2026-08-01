/**
 * Acronym expander module.
 *
 * Maps AWS service type IDs to their full names with acronym expansions,
 * and provides utilities to expand acronyms in plain-language text so
 * that no undefined abbreviations appear in the explanation.
 *
 * Validates: Requirements 8.1
 */

/**
 * Maps common AWS/infrastructure acronyms to their full definitions.
 * Used to ensure all acronyms are expanded on first use in explanations.
 */
export const ACRONYM_DEFINITIONS: Readonly<Record<string, string>> = {
  VPC: 'Virtual Private Cloud',
  AZ: 'Availability Zone',
  IAM: 'Identity and Access Management',
  EC2: 'Elastic Compute Cloud',
  S3: 'Simple Storage Service',
  RDS: 'Relational Database Service',
  ECS: 'Elastic Container Service',
  EKS: 'Elastic Kubernetes Service',
  EBS: 'Elastic Block Store',
  EFS: 'Elastic File System',
  ALB: 'Application Load Balancer',
  NLB: 'Network Load Balancer',
  ELB: 'Elastic Load Balancer',
  CDN: 'Content Delivery Network',
  DNS: 'Domain Name System',
  API: 'Application Programming Interface',
  SQS: 'Simple Queue Service',
  SNS: 'Simple Notification Service',
  KMS: 'Key Management Service',
  WAF: 'Web Application Firewall',
  DMS: 'Database Migration Service',
  EMR: 'Elastic MapReduce',
  MSK: 'Managed Streaming for Kafka',
  IoT: 'Internet of Things',
  ML: 'Machine Learning',
  AI: 'Artificial Intelligence',
  CI: 'Continuous Integration',
  CD: 'Continuous Delivery',
  IaC: 'Infrastructure as Code',
  DDoS: 'Distributed Denial of Service',
  SSL: 'Secure Sockets Layer',
  TLS: 'Transport Layer Security',
  ETL: 'Extract, Transform, Load',
  SFTP: 'Secure File Transfer Protocol',
  TCP: 'Transmission Control Protocol',
  UDP: 'User Datagram Protocol',
  HTTP: 'Hypertext Transfer Protocol',
  HTTPS: 'Hypertext Transfer Protocol Secure',
  NAT: 'Network Address Translation',
  ECR: 'Elastic Container Registry',
};

/**
 * Maps AWS service type IDs to their full display names with acronyms spelled out.
 * e.g., 'alb' → 'Application Load Balancer (ALB)'
 * e.g., 'rds' → 'Amazon Relational Database Service (RDS)'
 */
export const SERVICE_FULL_NAMES: Readonly<Record<string, string>> = {
  ec2: 'Amazon Elastic Compute Cloud (EC2)',
  lambda: 'AWS Lambda',
  ecs: 'Amazon Elastic Container Service (ECS)',
  eks: 'Amazon Elastic Kubernetes Service (EKS)',
  fargate: 'AWS Fargate',
  'elastic-beanstalk': 'AWS Elastic Beanstalk',
  lightsail: 'Amazon Lightsail',
  batch: 'AWS Batch',
  outposts: 'AWS Outposts',
  'app-runner': 'AWS App Runner',
  ecr: 'Amazon Elastic Container Registry (ECR)',
  s3: 'Amazon Simple Storage Service (S3)',
  ebs: 'Amazon Elastic Block Store (EBS)',
  efs: 'Amazon Elastic File System (EFS)',
  fsx: 'Amazon FSx',
  'storage-gateway': 'AWS Storage Gateway',
  backup: 'AWS Backup',
  rds: 'Amazon Relational Database Service (RDS)',
  aurora: 'Amazon Aurora',
  dynamodb: 'Amazon DynamoDB',
  elasticache: 'Amazon ElastiCache',
  redshift: 'Amazon Redshift',
  neptune: 'Amazon Neptune',
  documentdb: 'Amazon DocumentDB',
  keyspaces: 'Amazon Keyspaces',
  timestream: 'Amazon Timestream',
  memorydb: 'Amazon MemoryDB for Redis',
  vpc: 'Amazon Virtual Private Cloud (VPC)',
  cloudfront: 'Amazon CloudFront',
  route53: 'Amazon Route 53',
  'api-gateway': 'Amazon API Gateway',
  elb: 'Elastic Load Balancing (ELB)',
  alb: 'Application Load Balancer (ALB)',
  nlb: 'Network Load Balancer (NLB)',
  'direct-connect': 'AWS Direct Connect',
  'transit-gateway': 'AWS Transit Gateway',
  'global-accelerator': 'AWS Global Accelerator',
  'nat-gateway': 'Network Address Translation (NAT) Gateway',
  'elastic-ip': 'Elastic IP',
  iam: 'AWS Identity and Access Management (IAM)',
  cognito: 'Amazon Cognito',
  waf: 'AWS Web Application Firewall (WAF)',
  shield: 'AWS Shield',
  kms: 'AWS Key Management Service (KMS)',
  'secrets-manager': 'AWS Secrets Manager',
  'certificate-manager': 'AWS Certificate Manager',
  guardduty: 'Amazon GuardDuty',
  inspector: 'Amazon Inspector',
  macie: 'Amazon Macie',
  sqs: 'Amazon Simple Queue Service (SQS)',
  sns: 'Amazon Simple Notification Service (SNS)',
  eventbridge: 'Amazon EventBridge',
  'step-functions': 'AWS Step Functions',
  appsync: 'AWS AppSync',
  mq: 'Amazon MQ',
  kinesis: 'Amazon Kinesis',
  athena: 'Amazon Athena',
  emr: 'Amazon Elastic MapReduce (EMR)',
  glue: 'AWS Glue',
  quicksight: 'Amazon QuickSight',
  opensearch: 'Amazon OpenSearch Service',
  msk: 'Amazon Managed Streaming for Apache Kafka (MSK)',
  'data-pipeline': 'AWS Data Pipeline',
  sagemaker: 'Amazon SageMaker',
  bedrock: 'Amazon Bedrock',
  rekognition: 'Amazon Rekognition',
  comprehend: 'Amazon Comprehend',
  lex: 'Amazon Lex',
  polly: 'Amazon Polly',
  textract: 'Amazon Textract',
  translate: 'Amazon Translate',
  cloudwatch: 'Amazon CloudWatch',
  cloudtrail: 'AWS CloudTrail',
  config: 'AWS Config',
  'systems-manager': 'AWS Systems Manager',
  cloudformation: 'AWS CloudFormation',
  organizations: 'AWS Organizations',
  'trusted-advisor': 'AWS Trusted Advisor',
  codecommit: 'AWS CodeCommit',
  codebuild: 'AWS CodeBuild',
  codedeploy: 'AWS CodeDeploy',
  codepipeline: 'AWS CodePipeline',
  dms: 'AWS Database Migration Service (DMS)',
  datasync: 'AWS DataSync',
  'transfer-family': 'AWS Transfer Family',
  'iot-core': 'AWS IoT Core',
  'iot-greengrass': 'AWS IoT Greengrass',
  mediaconvert: 'AWS Elemental MediaConvert',
  elemental: 'AWS Elemental',
  generic: 'Custom Service',
};

/**
 * Get the full expanded name for an AWS service type ID.
 * Returns the service type string itself if no mapping exists.
 *
 * @param serviceType - The AWS service type identifier
 * @returns Full service name with acronym expansion
 *
 * @example
 * getExpandedServiceName('alb') // → 'Application Load Balancer (ALB)'
 * getExpandedServiceName('rds') // → 'Amazon Relational Database Service (RDS)'
 */
export function getExpandedServiceName(serviceType: string): string {
  return SERVICE_FULL_NAMES[serviceType] || serviceType;
}

/**
 * Expand acronyms in a text by replacing the first occurrence of each
 * recognized acronym with its full definition followed by the acronym
 * in parentheses. Subsequent occurrences are left as-is.
 *
 * This ensures no undefined acronyms appear in generated explanations
 * (Requirement 8.1).
 *
 * @param text - The text to expand acronyms in
 * @returns Text with first-use acronyms expanded
 *
 * @example
 * expandAcronyms("Deploy in a VPC with ALB")
 * // → "Deploy in a Virtual Private Cloud (VPC) with Application Load Balancer (ALB)"
 */
export function expandAcronyms(text: string): string {
  const usedAcronyms = new Set<string>();
  let result = text;

  for (const [acronym, definition] of Object.entries(ACRONYM_DEFINITIONS)) {
    const regex = new RegExp(`\\b${acronym}\\b`, 'g');
    if (regex.test(result) && !usedAcronyms.has(acronym)) {
      usedAcronyms.add(acronym);
      // Replace only the first occurrence with expanded form
      result = result.replace(
        new RegExp(`\\b${acronym}\\b`),
        `${definition} (${acronym})`
      );
    }
  }

  return result;
}
