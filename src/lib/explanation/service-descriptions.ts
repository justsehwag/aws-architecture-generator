/**
 * AWS service purpose descriptions mapped by service type.
 *
 * Each entry provides a human-readable description of what the service does,
 * used to generate the summary table in architecture explanations.
 * All descriptions avoid undefined acronyms — any acronym is expanded on first
 * use (e.g., "Application Load Balancer (ALB)").
 *
 * Validates: Requirements 8.1, 8.2
 */

/**
 * Map of AWS service types to their human-readable purpose descriptions.
 * Used to produce meaningful descriptions in the explanation summary table.
 *
 * Each description:
 * - Starts with a verb (e.g., "Provides", "Runs", "Manages")
 * - Uses plain language understandable by non-technical stakeholders
 * - Expands any technical abbreviations inline
 */
export const SERVICE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  // ─── Compute ──────────────────────────────────────────────────────────────────
  ec2: 'Amazon Elastic Compute Cloud (EC2) is a scalable virtual server service that provides resizable compute capacity for running applications',
  lambda: 'AWS Lambda is a serverless compute service that runs code in response to events without provisioning or managing servers',
  ecs: 'Amazon Elastic Container Service (ECS) orchestrates Docker containers at scale across a managed cluster',
  eks: 'Amazon Elastic Kubernetes Service (EKS) manages Kubernetes clusters for deploying and scaling containerized workloads',
  fargate: 'AWS Fargate is a serverless compute engine that runs containers without requiring management of the underlying server infrastructure',
  'elastic-beanstalk': 'AWS Elastic Beanstalk deploys and scales web applications and services automatically with managed infrastructure',
  lightsail: 'Amazon Lightsail provides simple virtual private servers for smaller workloads with predictable pricing',
  batch: 'AWS Batch efficiently runs hundreds of thousands of batch computing jobs at any scale',
  outposts: 'AWS Outposts extends AWS infrastructure, services, and tools to on-premises data centers',
  'app-runner': 'AWS App Runner deploys containerized web applications and Application Programming Interfaces (APIs) with automatic scaling',

  // ─── Containers ─────────────────────────────────────────────────────────────
  ecr: 'Amazon Elastic Container Registry (ECR) stores, manages, and deploys Docker container images securely',

  // ─── Storage ────────────────────────────────────────────────────────────────
  s3: 'Amazon Simple Storage Service (S3) stores and retrieves any amount of data as objects with high durability',
  ebs: 'Amazon Elastic Block Store (EBS) provides persistent block-level storage volumes for compute instances',
  efs: 'Amazon Elastic File System (EFS) provides scalable shared file storage accessible from multiple instances simultaneously',
  fsx: 'Amazon FSx provides fully managed file systems optimized for specific workloads including Windows and Lustre',
  'storage-gateway': 'AWS Storage Gateway connects on-premises environments to cloud storage seamlessly',
  backup: 'AWS Backup centralizes and automates data backup across multiple AWS services',

  // ─── Databases ──────────────────────────────────────────────────────────────
  rds: 'Amazon Relational Database Service (RDS) manages relational databases including MySQL, PostgreSQL, and SQL Server with automated backups and patching',
  aurora: 'Amazon Aurora provides a high-performance managed relational database compatible with MySQL and PostgreSQL with up to 5x throughput improvement',
  dynamodb: 'Amazon DynamoDB delivers fast, flexible NoSQL database service for applications requiring consistent single-digit millisecond latency at any scale',
  elasticache: 'Amazon ElastiCache provides in-memory caching using Redis or Memcached to accelerate application performance',
  redshift: 'Amazon Redshift runs complex analytical queries across petabytes of structured data in a fully managed data warehouse',
  neptune: 'Amazon Neptune manages graph databases for applications with highly connected datasets and complex relationships',
  documentdb: 'Amazon DocumentDB provides a fully managed document database compatible with MongoDB workloads',
  keyspaces: 'Amazon Keyspaces manages Apache Cassandra-compatible wide-column database tables with serverless scaling',
  timestream: 'Amazon Timestream stores and analyzes time-series data at scale for Internet of Things (IoT) and operational applications',
  memorydb: 'Amazon MemoryDB provides a Redis-compatible in-memory database with Multi-Availability Zone durability',

  // ─── Networking ─────────────────────────────────────────────────────────────
  vpc: 'Amazon Virtual Private Cloud (VPC) isolates cloud resources within a logically separate private virtual network',
  cloudfront: 'Amazon CloudFront is a Content Delivery Network (CDN) that distributes content globally through edge locations to reduce latency',
  route53: 'Amazon Route 53 routes end users to applications via scalable Domain Name System (DNS) resolution with health checking',
  'api-gateway': 'Amazon Application Programming Interface (API) Gateway creates, publishes, and manages APIs at any scale with traffic management and authorization',
  elb: 'Elastic Load Balancing (ELB) distributes incoming application traffic across multiple targets for improved availability',
  alb: 'Application Load Balancer (ALB) routes Hypertext Transfer Protocol (HTTP) and HTTPS traffic to targets based on request content',
  nlb: 'Network Load Balancer (NLB) routes Transmission Control Protocol (TCP) and User Datagram Protocol (UDP) traffic with ultra-low latency',
  'direct-connect': 'AWS Direct Connect establishes dedicated private network connections from on-premises data centers to AWS',
  'transit-gateway': 'AWS Transit Gateway connects multiple Virtual Private Clouds (VPCs) and on-premises networks through a central hub',
  'global-accelerator': 'AWS Global Accelerator improves global application availability and performance by routing traffic through the AWS backbone network',
  'nat-gateway': 'Network Address Translation (NAT) Gateway allows private subnet resources to access the internet without being publicly exposed',
  'elastic-ip': 'Elastic IP provides a static public Internet Protocol (IP) address for dynamic cloud resources',

  // ─── Security & Identity ────────────────────────────────────────────────────
  iam: 'AWS Identity and Access Management (IAM) controls who can access AWS resources and what actions they can perform',
  cognito: 'Amazon Cognito manages user authentication, authorization, and user pools for web and mobile applications',
  waf: 'AWS Web Application Firewall (WAF) protects web applications from common exploits and malicious traffic patterns',
  shield: 'AWS Shield provides managed protection against Distributed Denial of Service (DDoS) attacks',
  kms: 'AWS Key Management Service (KMS) creates and controls encryption keys used to protect data at rest and in transit',
  'secrets-manager': 'AWS Secrets Manager stores, rotates, and retrieves database credentials and other secrets securely with automatic rotation',
  'certificate-manager': 'AWS Certificate Manager provisions and manages Secure Sockets Layer (SSL) and Transport Layer Security (TLS) certificates',
  guardduty: 'Amazon GuardDuty continuously monitors for malicious activity and unauthorized behavior using threat intelligence',
  inspector: 'Amazon Inspector assesses applications for software vulnerabilities and deviations from security best practices',
  macie: 'Amazon Macie discovers and protects sensitive data stored in Amazon Simple Storage Service (S3) using machine learning',

  // ─── Application Integration ────────────────────────────────────────────────
  sqs: 'Amazon Simple Queue Service (SQS) decouples application components with fully managed message queues',
  sns: 'Amazon Simple Notification Service (SNS) sends notifications and messages to subscribers and other services via pub/sub',
  eventbridge: 'Amazon EventBridge routes events between AWS services, Software as a Service (SaaS) applications, and custom applications',
  'step-functions': 'AWS Step Functions coordinates distributed application components using visual state machine workflows',
  appsync: 'AWS AppSync provides managed GraphQL Application Programming Interfaces (APIs) with real-time data synchronization',
  mq: 'Amazon MQ manages message brokers compatible with industry-standard protocols including Advanced Message Queuing Protocol (AMQP)',

  // ─── Analytics ──────────────────────────────────────────────────────────────
  kinesis: 'Amazon Kinesis collects, processes, and analyzes real-time streaming data at any scale',
  athena: 'Amazon Athena queries data directly in Amazon Simple Storage Service (S3) using standard Structured Query Language (SQL)',
  emr: 'Amazon Elastic MapReduce (EMR) processes large amounts of data using open-source frameworks like Apache Spark and Hadoop',
  glue: 'AWS Glue prepares and transforms data for analytics using serverless Extract, Transform, and Load (ETL) jobs',
  quicksight: 'Amazon QuickSight creates interactive business intelligence dashboards and visualizations from data',
  opensearch: 'Amazon OpenSearch Service searches, analyzes, and visualizes data in near real-time for log analytics and monitoring',
  msk: 'Amazon Managed Streaming for Apache Kafka (MSK) manages Apache Kafka clusters for streaming data pipelines',
  'data-pipeline': 'AWS Data Pipeline moves and transforms data between AWS services on a defined schedule',

  // ─── AI/ML ──────────────────────────────────────────────────────────────────
  sagemaker: 'Amazon SageMaker builds, trains, and deploys machine learning models at scale with fully managed infrastructure',
  bedrock: 'Amazon Bedrock provides access to foundation models for building generative Artificial Intelligence (AI) applications',
  rekognition: 'Amazon Rekognition analyzes images and videos to detect objects, scenes, faces, and inappropriate content',
  comprehend: 'Amazon Comprehend extracts insights and relationships from text using Natural Language Processing (NLP)',
  lex: 'Amazon Lex builds conversational interfaces using voice and text powered by the same technology as Alexa',
  polly: 'Amazon Polly converts text into natural-sounding speech using deep learning',
  textract: 'Amazon Textract extracts text, forms, and tables from scanned documents automatically using machine learning',
  translate: 'Amazon Translate provides neural machine translation between languages in real time',

  // ─── Management & Governance ────────────────────────────────────────────────
  cloudwatch: 'Amazon CloudWatch monitors AWS resources and applications with metrics, logs, alarms, and dashboards',
  cloudtrail: 'AWS CloudTrail records AWS Application Programming Interface (API) calls for auditing, compliance, and operational troubleshooting',
  config: 'AWS Config tracks AWS resource configurations and evaluates compliance against defined rules continuously',
  'systems-manager': 'AWS Systems Manager manages and automates operational tasks across AWS resources with a unified interface',
  cloudformation: 'AWS CloudFormation provisions and manages AWS infrastructure using declarative templates as Infrastructure as Code (IaC)',
  organizations: 'AWS Organizations centrally manages and governs multiple AWS accounts with service control policies',
  'trusted-advisor': 'AWS Trusted Advisor recommends optimizations for cost, performance, security, fault tolerance, and service limits',

  // ─── Developer Tools ────────────────────────────────────────────────────────
  codecommit: 'AWS CodeCommit hosts private Git repositories for source code with encryption at rest',
  codebuild: 'AWS CodeBuild compiles source code, runs tests, and produces deployment-ready packages in a managed build environment',
  codedeploy: 'AWS CodeDeploy automates application deployments to Amazon Elastic Compute Cloud (EC2), Lambda, and on-premises servers',
  codepipeline: 'AWS CodePipeline automates Continuous Integration and Continuous Delivery (CI/CD) pipelines for application updates',

  // ─── Migration & Transfer ──────────────────────────────────────────────────
  dms: 'AWS Database Migration Service (DMS) migrates databases to AWS with minimal downtime during the migration process',
  datasync: 'AWS DataSync transfers data between on-premises storage and AWS storage services automatically',
  'transfer-family': 'AWS Transfer Family transfers files into and out of AWS using Secure File Transfer Protocol (SFTP), FTPS, and FTP',

  // ─── IoT ────────────────────────────────────────────────────────────────────
  'iot-core': 'AWS Internet of Things (IoT) Core connects IoT devices to the cloud securely with bidirectional messaging',
  'iot-greengrass': 'AWS IoT Greengrass runs local compute, messaging, and machine learning inference on Internet of Things (IoT) edge devices',

  // ─── Media ──────────────────────────────────────────────────────────────────
  mediaconvert: 'AWS Elemental MediaConvert converts media files into formats suitable for broadcast and multi-screen streaming delivery',
  elemental: 'AWS Elemental processes and delivers live video streams for broadcast and streaming distribution',
};

/**
 * Get the human-readable purpose description for a given AWS service type.
 * Returns undefined if the service type is not in the descriptions map.
 *
 * @param serviceType - The AWS service type identifier (e.g., 'lambda', 's3')
 * @returns The purpose description string, or undefined for unknown service types
 */
export function getServiceDescription(serviceType: string): string | undefined {
  return SERVICE_DESCRIPTIONS[serviceType];
}

/**
 * Get all service types that have descriptions available.
 *
 * @returns Array of service type strings with available descriptions
 */
export function getDescribedServiceTypes(): string[] {
  return Object.keys(SERVICE_DESCRIPTIONS);
}
