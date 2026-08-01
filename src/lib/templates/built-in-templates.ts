/**
 * Built-in Architecture Templates
 *
 * Defines 8 pre-built architecture templates for common AWS patterns.
 * Each template includes a name, description (50-500 chars), category,
 * at least 2 use cases, and an S3 key for the corresponding .drawio file.
 *
 * Validates: Requirements 5.1, 5.3
 */

import type { TemplateCategory } from '@/types/template';
import { getTemplateKey } from '@/lib/storage/constants';

/**
 * A built-in template definition used to seed the template library.
 */
export interface BuiltInTemplateDefinition {
  templateId: string;
  name: string;
  description: string;
  category: TemplateCategory;
  useCases: string[];
  s3Key: string;
}

/**
 * 8 built-in architecture templates covering common AWS patterns.
 */
export const BUILT_IN_TEMPLATES: BuiltInTemplateDefinition[] = [
  {
    templateId: 'three-tier-web-app',
    name: '3-Tier Web Application',
    description:
      'A classic three-tier architecture with CloudFront CDN for static content delivery, an Application Load Balancer distributing traffic to EC2 or ECS compute instances, and Amazon Aurora for managed relational database storage with read replicas.',
    category: 'web-application',
    useCases: [
      'E-commerce platforms requiring high availability and scalable web serving',
      'Content management systems with separate presentation, logic, and data layers',
      'Enterprise web portals with session management and database-backed user accounts',
    ],
    s3Key: getTemplateKey('three-tier-web-app'),
  },
  {
    templateId: 'serverless-api',
    name: 'Serverless API',
    description:
      'A fully serverless REST API built with Amazon API Gateway routing requests to AWS Lambda functions for business logic, with DynamoDB providing fast, scalable NoSQL data persistence. Ideal for event-driven workloads with variable traffic.',
    category: 'serverless',
    useCases: [
      'Mobile and single-page application backends with unpredictable traffic patterns',
      'Webhook processing and third-party integration endpoints',
      'Rapid prototyping of REST APIs without infrastructure management overhead',
    ],
    s3Key: getTemplateKey('serverless-api'),
  },
  {
    templateId: 'microservices',
    name: 'Microservices',
    description:
      'A containerized microservices architecture using an Application Load Balancer to route traffic to multiple ECS Fargate services, each independently deployable. Backed by Amazon RDS for relational data and ElastiCache for low-latency caching.',
    category: 'microservices',
    useCases: [
      'Large-scale applications requiring independent service deployment and scaling',
      'Platform modernization migrating from monolithic to service-oriented architecture',
      'Multi-team development environments where services have distinct ownership',
    ],
    s3Key: getTemplateKey('microservices'),
  },
  {
    templateId: 'ai-chatbot',
    name: 'AI Chatbot',
    description:
      'An AI-powered conversational interface using CloudFront and API Gateway to handle user requests, Lambda for orchestration logic, Amazon Bedrock for large language model inference, and DynamoDB for conversation history and session state.',
    category: 'ai-ml',
    useCases: [
      'Customer support chatbots with context-aware responses and conversation memory',
      'Internal knowledge base assistants for enterprise document retrieval',
      'Interactive product recommendation engines using natural language queries',
    ],
    s3Key: getTemplateKey('ai-chatbot'),
  },
  {
    templateId: 'sap-on-aws',
    name: 'SAP on AWS',
    description:
      'An enterprise SAP deployment running on EC2 instances within a dedicated VPC, with EBS volumes for high-performance storage and S3 for backups. Designed for mission-critical SAP workloads requiring consistent performance and disaster recovery.',
    category: 'enterprise',
    useCases: [
      'SAP S/4HANA migrations from on-premises to cloud infrastructure',
      'SAP Business Suite deployments with high availability across multiple AZs',
      'Hybrid SAP landscapes connecting cloud-hosted and on-premises SAP systems',
    ],
    s3Key: getTemplateKey('sap-on-aws'),
  },
  {
    templateId: 'data-lake',
    name: 'Data Lake',
    description:
      'A scalable data lake architecture using Amazon S3 as the central data store, AWS Glue for ETL and cataloging, Amazon Athena for serverless SQL queries, QuickSight for visualization, and Lake Formation for governance and access control.',
    category: 'data-analytics',
    useCases: [
      'Enterprise analytics platforms consolidating data from multiple operational systems',
      'Business intelligence dashboards with ad-hoc query capabilities on large datasets',
      'Data science environments requiring governed access to raw and transformed data',
    ],
    s3Key: getTemplateKey('data-lake'),
  },
  {
    templateId: 'ml-pipeline',
    name: 'ML Pipeline',
    description:
      'A machine learning pipeline using Amazon S3 for training data storage, SageMaker for model training and deployment, Lambda for preprocessing and inference triggers, and API Gateway to expose model predictions as a REST endpoint.',
    category: 'ai-ml',
    useCases: [
      'Automated model training and deployment pipelines with CI/CD integration',
      'Real-time prediction APIs for fraud detection or recommendation systems',
      'Batch inference workflows processing large datasets on a scheduled basis',
    ],
    s3Key: getTemplateKey('ml-pipeline'),
  },
  {
    templateId: 'event-driven',
    name: 'Event-Driven Architecture',
    description:
      'An asynchronous event-driven system using Amazon SNS for fan-out messaging, SQS for reliable queue-based processing, Lambda for event handlers, DynamoDB for state persistence, and EventBridge for event routing and scheduling rules.',
    category: 'event-driven',
    useCases: [
      'Order processing systems with decoupled inventory, payment, and shipping services',
      'Real-time notification pipelines handling millions of events per day',
      'Workflow orchestration with event-based triggers and dead letter queue handling',
    ],
    s3Key: getTemplateKey('event-driven'),
  },
];

/**
 * Returns all built-in template definitions.
 */
export function getBuiltInTemplates(): BuiltInTemplateDefinition[] {
  return BUILT_IN_TEMPLATES;
}

/**
 * Finds a built-in template by its ID.
 * @returns The template definition or undefined if not found.
 */
export function getBuiltInTemplateById(
  templateId: string
): BuiltInTemplateDefinition | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.templateId === templateId);
}
