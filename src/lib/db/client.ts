import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB client configuration.
 * Uses environment variables for region and table names.
 */
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * DynamoDB DocumentClient with marshalling options.
 * Converts empty strings to null, removes undefined values.
 */
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Table names from environment variables with defaults for local development.
 */
export const TABLE_NAMES = {
  DIAGRAMS: process.env.DIAGRAMS_TABLE_NAME || 'Diagrams',
  VERSIONS: process.env.VERSIONS_TABLE_NAME || 'Versions',
  TEMPLATES: process.env.TEMPLATES_TABLE_NAME || 'Templates',
} as const;

/**
 * GSI names used across the data access layer.
 */
export const GSI_NAMES = {
  USER_TEMPLATES: 'UserTemplatesIndex',
  DIAGRAM_BY_ID: 'DiagramByIdIndex',
} as const;
