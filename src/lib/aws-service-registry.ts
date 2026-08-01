import { AWSServiceType } from '@/types/architecture';

/**
 * Service category names used to organize AWS services in the registry.
 */
export type ServiceCategory =
  | 'Compute'
  | 'Containers'
  | 'Storage'
  | 'Databases'
  | 'Networking'
  | 'Security'
  | 'Application Integration'
  | 'Analytics'
  | 'AI/ML'
  | 'Management'
  | 'Developer Tools'
  | 'Migration'
  | 'IoT'
  | 'Media';

/**
 * A single entry in the AWS service registry, mapping a service type
 * to its Draw.io icon style and category.
 */
export interface ServiceRegistryEntry {
  /** The AWS service type identifier */
  type: AWSServiceType;
  /** Human-readable display name */
  displayName: string;
  /** Draw.io mxGraph style string for rendering the official AWS icon */
  drawioStyle: string;
  /** The category this service belongs to */
  category: ServiceCategory;
}

/**
 * Fallback generic node style used for unrecognized services.
 * Renders as a labeled rectangle with a cloud icon and review annotation.
 */
export const GENERIC_NODE_STYLE =
  'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.general_AWS_cloud;' +
  'labelBackgroundColor=none;sketch=0;fillColor=#232F3E;fontColor=#232F3E;';

/**
 * Internal registry mapping each supported AWS service type to its
 * Draw.io icon style and metadata. Organized by category.
 *
 * Icon styles use the mxgraph.aws4 shape library format.
 * @see https://www.drawio.com/blog/aws-diagrams
 */
const SERVICE_REGISTRY: ReadonlyMap<AWSServiceType, ServiceRegistryEntry> = new Map([
  // ─── Compute ──────────────────────────────────────────────────────────────────
  ['ec2', {
    type: 'ec2',
    displayName: 'Amazon EC2',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2',
    category: 'Compute',
  }],
  ['lambda', {
    type: 'lambda',
    displayName: 'AWS Lambda',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda',
    category: 'Compute',
  }],
  ['ecs', {
    type: 'ecs',
    displayName: 'Amazon ECS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ecs',
    category: 'Compute',
  }],
  ['eks', {
    type: 'eks',
    displayName: 'Amazon EKS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.eks',
    category: 'Compute',
  }],
  ['fargate', {
    type: 'fargate',
    displayName: 'AWS Fargate',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.fargate',
    category: 'Compute',
  }],
  ['elastic-beanstalk', {
    type: 'elastic-beanstalk',
    displayName: 'AWS Elastic Beanstalk',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elastic_beanstalk',
    category: 'Compute',
  }],
  ['lightsail', {
    type: 'lightsail',
    displayName: 'Amazon Lightsail',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lightsail',
    category: 'Compute',
  }],
  ['batch', {
    type: 'batch',
    displayName: 'AWS Batch',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.batch',
    category: 'Compute',
  }],
  ['outposts', {
    type: 'outposts',
    displayName: 'AWS Outposts',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.outposts',
    category: 'Compute',
  }],
  ['app-runner', {
    type: 'app-runner',
    displayName: 'AWS App Runner',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.app_runner',
    category: 'Compute',
  }],

  // ─── Containers ─────────────────────────────────────────────────────────────
  ['ecr', {
    type: 'ecr',
    displayName: 'Amazon ECR',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ecr',
    category: 'Containers',
  }],

  // ─── Storage ────────────────────────────────────────────────────────────────
  ['s3', {
    type: 's3',
    displayName: 'Amazon S3',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.s3',
    category: 'Storage',
  }],
  ['ebs', {
    type: 'ebs',
    displayName: 'Amazon EBS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elastic_block_store',
    category: 'Storage',
  }],
  ['efs', {
    type: 'efs',
    displayName: 'Amazon EFS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elastic_file_system',
    category: 'Storage',
  }],
  ['fsx', {
    type: 'fsx',
    displayName: 'Amazon FSx',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.fsx',
    category: 'Storage',
  }],
  ['storage-gateway', {
    type: 'storage-gateway',
    displayName: 'AWS Storage Gateway',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.storage_gateway',
    category: 'Storage',
  }],
  ['backup', {
    type: 'backup',
    displayName: 'AWS Backup',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.backup',
    category: 'Storage',
  }],

  // ─── Databases ──────────────────────────────────────────────────────────────
  ['rds', {
    type: 'rds',
    displayName: 'Amazon RDS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rds',
    category: 'Databases',
  }],
  ['aurora', {
    type: 'aurora',
    displayName: 'Amazon Aurora',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.aurora',
    category: 'Databases',
  }],
  ['dynamodb', {
    type: 'dynamodb',
    displayName: 'Amazon DynamoDB',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.dynamodb',
    category: 'Databases',
  }],
  ['elasticache', {
    type: 'elasticache',
    displayName: 'Amazon ElastiCache',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elasticache',
    category: 'Databases',
  }],
  ['redshift', {
    type: 'redshift',
    displayName: 'Amazon Redshift',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.redshift',
    category: 'Databases',
  }],
  ['neptune', {
    type: 'neptune',
    displayName: 'Amazon Neptune',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.neptune',
    category: 'Databases',
  }],
  ['documentdb', {
    type: 'documentdb',
    displayName: 'Amazon DocumentDB',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.documentdb',
    category: 'Databases',
  }],
  ['keyspaces', {
    type: 'keyspaces',
    displayName: 'Amazon Keyspaces',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.keyspaces',
    category: 'Databases',
  }],
  ['timestream', {
    type: 'timestream',
    displayName: 'Amazon Timestream',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.timestream',
    category: 'Databases',
  }],
  ['memorydb', {
    type: 'memorydb',
    displayName: 'Amazon MemoryDB',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.memorydb_for_redis',
    category: 'Databases',
  }],

  // ─── Networking ─────────────────────────────────────────────────────────────
  ['vpc', {
    type: 'vpc',
    displayName: 'Amazon VPC',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.vpc',
    category: 'Networking',
  }],
  ['cloudfront', {
    type: 'cloudfront',
    displayName: 'Amazon CloudFront',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cloudfront',
    category: 'Networking',
  }],
  ['route53', {
    type: 'route53',
    displayName: 'Amazon Route 53',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.route_53',
    category: 'Networking',
  }],
  ['api-gateway', {
    type: 'api-gateway',
    displayName: 'Amazon API Gateway',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.api_gateway',
    category: 'Networking',
  }],
  ['elb', {
    type: 'elb',
    displayName: 'Elastic Load Balancing',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elastic_load_balancing',
    category: 'Networking',
  }],
  ['alb', {
    type: 'alb',
    displayName: 'Application Load Balancer',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.application_load_balancer',
    category: 'Networking',
  }],
  ['nlb', {
    type: 'nlb',
    displayName: 'Network Load Balancer',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.network_load_balancer',
    category: 'Networking',
  }],
  ['direct-connect', {
    type: 'direct-connect',
    displayName: 'AWS Direct Connect',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.direct_connect',
    category: 'Networking',
  }],
  ['transit-gateway', {
    type: 'transit-gateway',
    displayName: 'AWS Transit Gateway',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.transit_gateway',
    category: 'Networking',
  }],
  ['global-accelerator', {
    type: 'global-accelerator',
    displayName: 'AWS Global Accelerator',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.global_accelerator',
    category: 'Networking',
  }],
  ['nat-gateway', {
    type: 'nat-gateway',
    displayName: 'NAT Gateway',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.nat_gateway',
    category: 'Networking',
  }],
  ['elastic-ip', {
    type: 'elastic-ip',
    displayName: 'Elastic IP',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elastic_ip_address',
    category: 'Networking',
  }],

  // ─── Security & Identity ────────────────────────────────────────────────────
  ['iam', {
    type: 'iam',
    displayName: 'AWS IAM',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.identity_and_access_management',
    category: 'Security',
  }],
  ['cognito', {
    type: 'cognito',
    displayName: 'Amazon Cognito',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cognito',
    category: 'Security',
  }],
  ['waf', {
    type: 'waf',
    displayName: 'AWS WAF',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.waf',
    category: 'Security',
  }],
  ['shield', {
    type: 'shield',
    displayName: 'AWS Shield',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.shield',
    category: 'Security',
  }],
  ['kms', {
    type: 'kms',
    displayName: 'AWS KMS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.key_management_service',
    category: 'Security',
  }],
  ['secrets-manager', {
    type: 'secrets-manager',
    displayName: 'AWS Secrets Manager',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.secrets_manager',
    category: 'Security',
  }],
  ['certificate-manager', {
    type: 'certificate-manager',
    displayName: 'AWS Certificate Manager',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.certificate_manager',
    category: 'Security',
  }],
  ['guardduty', {
    type: 'guardduty',
    displayName: 'Amazon GuardDuty',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.guardduty',
    category: 'Security',
  }],
  ['inspector', {
    type: 'inspector',
    displayName: 'Amazon Inspector',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.inspector',
    category: 'Security',
  }],
  ['macie', {
    type: 'macie',
    displayName: 'Amazon Macie',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.macie',
    category: 'Security',
  }],

  // ─── Application Integration ────────────────────────────────────────────────
  ['sqs', {
    type: 'sqs',
    displayName: 'Amazon SQS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sqs',
    category: 'Application Integration',
  }],
  ['sns', {
    type: 'sns',
    displayName: 'Amazon SNS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sns',
    category: 'Application Integration',
  }],
  ['eventbridge', {
    type: 'eventbridge',
    displayName: 'Amazon EventBridge',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.eventbridge',
    category: 'Application Integration',
  }],
  ['step-functions', {
    type: 'step-functions',
    displayName: 'AWS Step Functions',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.step_functions',
    category: 'Application Integration',
  }],
  ['appsync', {
    type: 'appsync',
    displayName: 'AWS AppSync',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.appsync',
    category: 'Application Integration',
  }],
  ['mq', {
    type: 'mq',
    displayName: 'Amazon MQ',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.mq',
    category: 'Application Integration',
  }],

  // ─── Analytics ──────────────────────────────────────────────────────────────
  ['kinesis', {
    type: 'kinesis',
    displayName: 'Amazon Kinesis',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.kinesis',
    category: 'Analytics',
  }],
  ['athena', {
    type: 'athena',
    displayName: 'Amazon Athena',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.athena',
    category: 'Analytics',
  }],
  ['emr', {
    type: 'emr',
    displayName: 'Amazon EMR',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.emr',
    category: 'Analytics',
  }],
  ['glue', {
    type: 'glue',
    displayName: 'AWS Glue',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.glue',
    category: 'Analytics',
  }],
  ['quicksight', {
    type: 'quicksight',
    displayName: 'Amazon QuickSight',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.quicksight',
    category: 'Analytics',
  }],
  ['opensearch', {
    type: 'opensearch',
    displayName: 'Amazon OpenSearch',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.opensearch_service',
    category: 'Analytics',
  }],
  ['msk', {
    type: 'msk',
    displayName: 'Amazon MSK',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.managed_streaming_for_kafka',
    category: 'Analytics',
  }],
  ['data-pipeline', {
    type: 'data-pipeline',
    displayName: 'AWS Data Pipeline',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.data_pipeline',
    category: 'Analytics',
  }],

  // ─── AI/ML ──────────────────────────────────────────────────────────────────
  ['sagemaker', {
    type: 'sagemaker',
    displayName: 'Amazon SageMaker',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sagemaker',
    category: 'AI/ML',
  }],
  ['bedrock', {
    type: 'bedrock',
    displayName: 'Amazon Bedrock',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.bedrock',
    category: 'AI/ML',
  }],
  ['rekognition', {
    type: 'rekognition',
    displayName: 'Amazon Rekognition',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rekognition',
    category: 'AI/ML',
  }],
  ['comprehend', {
    type: 'comprehend',
    displayName: 'Amazon Comprehend',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.comprehend',
    category: 'AI/ML',
  }],
  ['lex', {
    type: 'lex',
    displayName: 'Amazon Lex',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lex',
    category: 'AI/ML',
  }],
  ['polly', {
    type: 'polly',
    displayName: 'Amazon Polly',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.polly',
    category: 'AI/ML',
  }],
  ['textract', {
    type: 'textract',
    displayName: 'Amazon Textract',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.textract',
    category: 'AI/ML',
  }],
  ['translate', {
    type: 'translate',
    displayName: 'Amazon Translate',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.translate',
    category: 'AI/ML',
  }],

  // ─── Management & Governance ────────────────────────────────────────────────
  ['cloudwatch', {
    type: 'cloudwatch',
    displayName: 'Amazon CloudWatch',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cloudwatch',
    category: 'Management',
  }],
  ['cloudtrail', {
    type: 'cloudtrail',
    displayName: 'AWS CloudTrail',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cloudtrail',
    category: 'Management',
  }],
  ['config', {
    type: 'config',
    displayName: 'AWS Config',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.config',
    category: 'Management',
  }],
  ['systems-manager', {
    type: 'systems-manager',
    displayName: 'AWS Systems Manager',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.systems_manager',
    category: 'Management',
  }],
  ['cloudformation', {
    type: 'cloudformation',
    displayName: 'AWS CloudFormation',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cloudformation',
    category: 'Management',
  }],
  ['organizations', {
    type: 'organizations',
    displayName: 'AWS Organizations',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.organizations',
    category: 'Management',
  }],
  ['trusted-advisor', {
    type: 'trusted-advisor',
    displayName: 'AWS Trusted Advisor',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.trusted_advisor',
    category: 'Management',
  }],

  // ─── Developer Tools ────────────────────────────────────────────────────────
  ['codecommit', {
    type: 'codecommit',
    displayName: 'AWS CodeCommit',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.codecommit',
    category: 'Developer Tools',
  }],
  ['codebuild', {
    type: 'codebuild',
    displayName: 'AWS CodeBuild',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.codebuild',
    category: 'Developer Tools',
  }],
  ['codedeploy', {
    type: 'codedeploy',
    displayName: 'AWS CodeDeploy',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.codedeploy',
    category: 'Developer Tools',
  }],
  ['codepipeline', {
    type: 'codepipeline',
    displayName: 'AWS CodePipeline',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.codepipeline',
    category: 'Developer Tools',
  }],

  // ─── Migration & Transfer ──────────────────────────────────────────────────
  ['dms', {
    type: 'dms',
    displayName: 'AWS DMS',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.database_migration_service',
    category: 'Migration',
  }],
  ['datasync', {
    type: 'datasync',
    displayName: 'AWS DataSync',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.datasync',
    category: 'Migration',
  }],
  ['transfer-family', {
    type: 'transfer-family',
    displayName: 'AWS Transfer Family',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.transfer_family',
    category: 'Migration',
  }],

  // ─── IoT ────────────────────────────────────────────────────────────────────
  ['iot-core', {
    type: 'iot-core',
    displayName: 'AWS IoT Core',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.iot_core',
    category: 'IoT',
  }],
  ['iot-greengrass', {
    type: 'iot-greengrass',
    displayName: 'AWS IoT Greengrass',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.iot_greengrass',
    category: 'IoT',
  }],

  // ─── Media ──────────────────────────────────────────────────────────────────
  ['mediaconvert', {
    type: 'mediaconvert',
    displayName: 'AWS Elemental MediaConvert',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elemental_mediaconvert',
    category: 'Media',
  }],
  ['elemental', {
    type: 'elemental',
    displayName: 'AWS Elemental',
    drawioStyle: 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elemental_medialive',
    category: 'Media',
  }],
]);


/**
 * Mapping of category names to the service types that belong to each category.
 * Useful for grouping services in UI components and filtering.
 */
export const SERVICE_CATEGORIES: Readonly<Record<ServiceCategory, AWSServiceType[]>> = {
  Compute: ['ec2', 'lambda', 'ecs', 'eks', 'fargate', 'elastic-beanstalk', 'lightsail', 'batch', 'outposts', 'app-runner'],
  Containers: ['ecr'],
  Storage: ['s3', 'ebs', 'efs', 'fsx', 'storage-gateway', 'backup'],
  Databases: ['rds', 'aurora', 'dynamodb', 'elasticache', 'redshift', 'neptune', 'documentdb', 'keyspaces', 'timestream', 'memorydb'],
  Networking: ['vpc', 'cloudfront', 'route53', 'api-gateway', 'elb', 'alb', 'nlb', 'direct-connect', 'transit-gateway', 'global-accelerator', 'nat-gateway', 'elastic-ip'],
  Security: ['iam', 'cognito', 'waf', 'shield', 'kms', 'secrets-manager', 'certificate-manager', 'guardduty', 'inspector', 'macie'],
  'Application Integration': ['sqs', 'sns', 'eventbridge', 'step-functions', 'appsync', 'mq'],
  Analytics: ['kinesis', 'athena', 'emr', 'glue', 'quicksight', 'opensearch', 'msk', 'data-pipeline'],
  'AI/ML': ['sagemaker', 'bedrock', 'rekognition', 'comprehend', 'lex', 'polly', 'textract', 'translate'],
  Management: ['cloudwatch', 'cloudtrail', 'config', 'systems-manager', 'cloudformation', 'organizations', 'trusted-advisor'],
  'Developer Tools': ['codecommit', 'codebuild', 'codedeploy', 'codepipeline'],
  Migration: ['dms', 'datasync', 'transfer-family'],
  IoT: ['iot-core', 'iot-greengrass'],
  Media: ['mediaconvert', 'elemental'],
};


// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the Draw.io icon style string for a given AWS service type.
 * If the service is not recognized, returns the GENERIC_NODE_STYLE fallback.
 *
 * @param type - The AWS service type identifier
 * @returns The Draw.io mxGraph style string for the service icon
 */
export function getServiceIcon(type: string): string {
  const entry = SERVICE_REGISTRY.get(type as AWSServiceType);
  return entry ? entry.drawioStyle : GENERIC_NODE_STYLE;
}

/**
 * Checks whether a given service type string is a known/supported AWS service
 * in the registry. Used to determine if a service should be rendered with its
 * official icon or as a generic node with a review annotation.
 *
 * @param type - The service type string to check
 * @returns true if the service is in the supported registry
 */
export function isKnownService(type: string): boolean {
  return SERVICE_REGISTRY.has(type as AWSServiceType);
}

/**
 * Returns the category of a given AWS service type.
 * Returns undefined if the service type is not recognized.
 *
 * @param type - The AWS service type identifier
 * @returns The ServiceCategory or undefined for unknown services
 */
export function getServiceCategory(type: string): ServiceCategory | undefined {
  const entry = SERVICE_REGISTRY.get(type as AWSServiceType);
  return entry?.category;
}

/**
 * Returns the full registry entry for a given service type, or undefined
 * if the service is not in the supported registry.
 *
 * @param type - The AWS service type identifier
 * @returns The full ServiceRegistryEntry or undefined
 */
export function getServiceEntry(type: string): ServiceRegistryEntry | undefined {
  return SERVICE_REGISTRY.get(type as AWSServiceType);
}

/**
 * Returns all supported service types as an array.
 */
export function getAllServiceTypes(): AWSServiceType[] {
  return Array.from(SERVICE_REGISTRY.keys());
}
