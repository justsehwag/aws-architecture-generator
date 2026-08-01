/**
 * AWS Service Type union covering ~80 common AWS services.
 * Used to type-check service nodes in architecture specifications.
 */
export type AWSServiceType =
  // Compute
  | 'ec2'
  | 'lambda'
  | 'ecs'
  | 'eks'
  | 'fargate'
  | 'elastic-beanstalk'
  | 'lightsail'
  | 'batch'
  | 'outposts'
  | 'app-runner'
  // Containers
  | 'ecr'
  // Storage
  | 's3'
  | 'ebs'
  | 'efs'
  | 'fsx'
  | 'storage-gateway'
  | 'backup'
  // Database
  | 'rds'
  | 'aurora'
  | 'dynamodb'
  | 'elasticache'
  | 'redshift'
  | 'neptune'
  | 'documentdb'
  | 'keyspaces'
  | 'timestream'
  | 'memorydb'
  // Networking
  | 'vpc'
  | 'cloudfront'
  | 'route53'
  | 'api-gateway'
  | 'elb'
  | 'alb'
  | 'nlb'
  | 'direct-connect'
  | 'transit-gateway'
  | 'global-accelerator'
  | 'nat-gateway'
  | 'elastic-ip'
  // Security & Identity
  | 'iam'
  | 'cognito'
  | 'waf'
  | 'shield'
  | 'kms'
  | 'secrets-manager'
  | 'certificate-manager'
  | 'guardduty'
  | 'inspector'
  | 'macie'
  // Application Integration
  | 'sqs'
  | 'sns'
  | 'eventbridge'
  | 'step-functions'
  | 'appsync'
  | 'mq'
  // Analytics
  | 'kinesis'
  | 'athena'
  | 'emr'
  | 'glue'
  | 'quicksight'
  | 'opensearch'
  | 'msk'
  | 'data-pipeline'
  // Machine Learning
  | 'sagemaker'
  | 'bedrock'
  | 'rekognition'
  | 'comprehend'
  | 'lex'
  | 'polly'
  | 'textract'
  | 'translate'
  // Management & Governance
  | 'cloudwatch'
  | 'cloudtrail'
  | 'config'
  | 'systems-manager'
  | 'cloudformation'
  | 'organizations'
  | 'trusted-advisor'
  // Developer Tools
  | 'codecommit'
  | 'codebuild'
  | 'codedeploy'
  | 'codepipeline'
  // Migration & Transfer
  | 'dms'
  | 'datasync'
  | 'transfer-family'
  // IoT
  | 'iot-core'
  | 'iot-greengrass'
  // Media
  | 'mediaconvert'
  | 'elemental'
  // Generic fallback for unrecognized services
  | 'generic';

/**
 * Architecture specification produced by the LLM from a natural language prompt.
 * This is the core data structure passed between the Generation Lambda and the Diagram Engine.
 */
export interface ArchitectureSpec {
  id: string;
  name: string;
  description: string;
  region: string;
  services: ServiceNode[];
  connections: Connection[];
  groups: ResourceGroup[];
  metadata: ArchitectureMetadata;
}

/**
 * A single AWS service node within an architecture diagram.
 */
export interface ServiceNode {
  id: string;
  type: AWSServiceType;
  label: string;
  properties: Record<string, string>;
  groupId?: string;
  position?: { x: number; y: number };
}

/**
 * A connection (edge) between two service nodes in the architecture.
 */
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  protocol?: string;
  port?: number;
  bidirectional?: boolean;
}

/**
 * A resource group representing a logical container (VPC, subnet, AZ, etc.)
 * that groups service nodes together in the diagram.
 */
export interface ResourceGroup {
  id: string;
  type: 'region' | 'vpc' | 'subnet' | 'availability-zone' | 'security-group';
  label: string;
  parentId?: string;
  children: string[];
}

/**
 * Metadata associated with a generated architecture specification.
 */
export interface ArchitectureMetadata {
  prompt: string;
  generatedAt: string;
  llmModel: string;
  templateId?: string;
}
