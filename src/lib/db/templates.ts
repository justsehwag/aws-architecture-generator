import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLE_NAMES, GSI_NAMES } from './client';
import {
  NotFoundError,
  DatabaseError,
  LimitExceededError,
  ConditionalCheckFailedError,
} from './errors';
import type { TemplateCategory } from '@/types/template';

/**
 * Maximum number of custom templates a user can save.
 */
export const MAX_CUSTOM_TEMPLATES_PER_USER = 25;

/**
 * DynamoDB item shape for a template record.
 */
export interface TemplateRecord {
  templateId: string;
  name: string;
  description: string;
  category: TemplateCategory;
  useCases: string[];
  isBuiltIn: boolean;
  ownerId?: string;
  s3Key: string;
  createdAt: string;
}

/**
 * Input for creating a new template.
 */
export interface CreateTemplateInput {
  templateId: string;
  name: string;
  description: string;
  category: TemplateCategory;
  useCases: string[];
  isBuiltIn: boolean;
  ownerId?: string;
  s3Key: string;
}

/**
 * Creates a new template record in DynamoDB.
 */
export async function createTemplate(
  input: CreateTemplateInput
): Promise<TemplateRecord> {
  const now = new Date().toISOString();
  const record: TemplateRecord = {
    ...input,
    createdAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.TEMPLATES,
        Item: {
          PK: `TEMPLATE#${input.templateId}`,
          SK: 'META',
          ...record,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );
    return record;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new ConditionalCheckFailedError(
        `Template already exists: ${input.templateId}`
      );
    }
    throw new DatabaseError(
      'Failed to create template',
      'CREATE_FAILED',
      error
    );
  }
}

/**
 * Retrieves a template by its templateId.
 */
export async function getTemplate(
  templateId: string
): Promise<TemplateRecord> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.TEMPLATES,
        Key: {
          PK: `TEMPLATE#${templateId}`,
          SK: 'META',
        },
      })
    );

    if (!result.Item) {
      throw new NotFoundError('Template', templateId);
    }

    return itemToTemplateRecord(result.Item);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to get template', 'GET_FAILED', error);
  }
}

/**
 * Lists all built-in templates.
 * Queries the table with a filter on isBuiltIn = true.
 */
export async function listBuiltInTemplates(): Promise<TemplateRecord[]> {
  try {
    // Scan with filter for built-in templates
    // In practice, built-in templates are few, so a scan is acceptable.
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.TEMPLATES,
        IndexName: GSI_NAMES.USER_TEMPLATES,
        KeyConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: {
          ':ownerId': 'SYSTEM',
        },
      })
    );

    return (result.Items || []).map(itemToTemplateRecord);
  } catch (error) {
    throw new DatabaseError(
      'Failed to list built-in templates',
      'QUERY_FAILED',
      error
    );
  }
}

/**
 * Lists all custom templates for a specific user using the GSI.
 */
export async function listUserTemplates(
  userId: string
): Promise<TemplateRecord[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.TEMPLATES,
        IndexName: GSI_NAMES.USER_TEMPLATES,
        KeyConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: {
          ':ownerId': userId,
        },
        ScanIndexForward: false, // newest first
      })
    );

    return (result.Items || []).map(itemToTemplateRecord);
  } catch (error) {
    throw new DatabaseError(
      'Failed to list user templates',
      'QUERY_FAILED',
      error
    );
  }
}

/**
 * Deletes a template by its templateId.
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.TEMPLATES,
        Key: {
          PK: `TEMPLATE#${templateId}`,
          SK: 'META',
        },
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('Template', templateId);
    }
    throw new DatabaseError(
      'Failed to delete template',
      'DELETE_FAILED',
      error
    );
  }
}

/**
 * Counts the number of custom templates owned by a user.
 * Used for enforcing the 25 custom template limit.
 */
export async function countUserTemplates(userId: string): Promise<number> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.TEMPLATES,
        IndexName: GSI_NAMES.USER_TEMPLATES,
        KeyConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: {
          ':ownerId': userId,
        },
        Select: 'COUNT',
      })
    );

    return result.Count || 0;
  } catch (error) {
    throw new DatabaseError(
      'Failed to count user templates',
      'QUERY_FAILED',
      error
    );
  }
}

/**
 * Creates a custom template with limit enforcement.
 * Checks the user's template count before creating.
 *
 * @throws LimitExceededError if user has reached 25 custom templates
 */
export async function createUserTemplate(
  userId: string,
  input: Omit<CreateTemplateInput, 'isBuiltIn' | 'ownerId'>
): Promise<TemplateRecord> {
  const count = await countUserTemplates(userId);

  if (count >= MAX_CUSTOM_TEMPLATES_PER_USER) {
    throw new LimitExceededError(
      `Custom template limit reached. Maximum ${MAX_CUSTOM_TEMPLATES_PER_USER} templates allowed per user.`
    );
  }

  return createTemplate({
    ...input,
    isBuiltIn: false,
    ownerId: userId,
  });
}

/**
 * Converts a raw DynamoDB item to a typed TemplateRecord.
 */
function itemToTemplateRecord(
  item: Record<string, unknown>
): TemplateRecord {
  return {
    templateId: item.templateId as string,
    name: item.name as string,
    description: item.description as string,
    category: item.category as TemplateCategory,
    useCases: item.useCases as string[],
    isBuiltIn: item.isBuiltIn as boolean,
    ownerId: item.ownerId as string | undefined,
    s3Key: item.s3Key as string,
    createdAt: item.createdAt as string,
  };
}
