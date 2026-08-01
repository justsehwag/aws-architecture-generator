import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB client configuration.
 * Uses explicit credentials from BEDROCK_ACCESS_KEY_ID/BEDROCK_SECRET_ACCESS_KEY
 * for Amplify SSR where default credentials are not available.
 * Falls back to default credential chain for local dev / Lambda.
 */
const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID;
const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY;

const clientConfig: { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {
  region: process.env.DYNAMODB_REGION || process.env.AWS_REGION || 'ap-south-2',
};

if (accessKeyId && secretAccessKey) {
  clientConfig.credentials = { accessKeyId, secretAccessKey };
}

const client = new DynamoDBClient(clientConfig);

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
