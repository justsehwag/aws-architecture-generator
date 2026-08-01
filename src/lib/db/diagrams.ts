import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLE_NAMES } from './client';
import {
  NotFoundError,
  DatabaseError,
  ConditionalCheckFailedError,
} from './errors';

/**
 * Status of a diagram in the generation pipeline.
 */
export type DiagramStatus = 'generating' | 'ready' | 'error';

/**
 * DynamoDB item shape for a diagram record.
 */
export interface DiagramRecord {
  diagramId: string;
  userId: string;
  name: string;
  prompt: string;
  architectureSpec?: string;
  s3Key: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  serviceCount: number;
  status: DiagramStatus;
}

/**
 * Input for creating a new diagram.
 */
export interface CreateDiagramInput {
  diagramId: string;
  name: string;
  prompt: string;
  architectureSpec?: string;
  s3Key: string;
  templateId?: string;
  serviceCount: number;
  status: DiagramStatus;
}

/**
 * Fields that can be updated on an existing diagram.
 */
export interface UpdateDiagramInput {
  name?: string;
  architectureSpec?: string;
  s3Key?: string;
  serviceCount?: number;
  status?: DiagramStatus;
}

/**
 * Pagination result for listing diagrams.
 */
export interface PaginatedDiagrams {
  items: DiagramRecord[];
  lastKey?: Record<string, unknown>;
}

/**
 * Creates a new diagram record in DynamoDB.
 */
export async function createDiagram(
  userId: string,
  input: CreateDiagramInput
): Promise<DiagramRecord> {
  const now = new Date().toISOString();
  const record: DiagramRecord = {
    ...input,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.DIAGRAMS,
        Item: {
          PK: `USER#${userId}`,
          SK: `DIAGRAM#${input.diagramId}`,
          ...record,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );
    return record;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new ConditionalCheckFailedError(
        `Diagram already exists: ${input.diagramId}`
      );
    }
    throw new DatabaseError(
      'Failed to create diagram',
      'CREATE_FAILED',
      error
    );
  }
}

/**
 * Retrieves a single diagram by userId and diagramId.
 */
export async function getDiagram(
  userId: string,
  diagramId: string
): Promise<DiagramRecord> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.DIAGRAMS,
        Key: {
          PK: `USER#${userId}`,
          SK: `DIAGRAM#${diagramId}`,
        },
      })
    );

    if (!result.Item) {
      throw new NotFoundError('Diagram', diagramId);
    }

    return itemToDiagramRecord(result.Item);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to get diagram', 'GET_FAILED', error);
  }
}

/**
 * Updates an existing diagram with the provided fields.
 * Only non-undefined fields are updated.
 */
export async function updateDiagram(
  userId: string,
  diagramId: string,
  updates: UpdateDiagramInput
): Promise<DiagramRecord> {
  const expressionParts: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  // Always update updatedAt
  expressionParts.push('#updatedAt = :updatedAt');
  expressionNames['#updatedAt'] = 'updatedAt';
  expressionValues[':updatedAt'] = new Date().toISOString();

  if (updates.name !== undefined) {
    expressionParts.push('#name = :name');
    expressionNames['#name'] = 'name';
    expressionValues[':name'] = updates.name;
  }
  if (updates.architectureSpec !== undefined) {
    expressionParts.push('#architectureSpec = :architectureSpec');
    expressionNames['#architectureSpec'] = 'architectureSpec';
    expressionValues[':architectureSpec'] = updates.architectureSpec;
  }
  if (updates.s3Key !== undefined) {
    expressionParts.push('#s3Key = :s3Key');
    expressionNames['#s3Key'] = 's3Key';
    expressionValues[':s3Key'] = updates.s3Key;
  }
  if (updates.serviceCount !== undefined) {
    expressionParts.push('#serviceCount = :serviceCount');
    expressionNames['#serviceCount'] = 'serviceCount';
    expressionValues[':serviceCount'] = updates.serviceCount;
  }
  if (updates.status !== undefined) {
    expressionParts.push('#status = :status');
    expressionNames['#status'] = 'status';
    expressionValues[':status'] = updates.status;
  }

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.DIAGRAMS,
        Key: {
          PK: `USER#${userId}`,
          SK: `DIAGRAM#${diagramId}`,
        },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      throw new NotFoundError('Diagram', diagramId);
    }

    return itemToDiagramRecord(result.Attributes);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('Diagram', diagramId);
    }
    throw new DatabaseError('Failed to update diagram', 'UPDATE_FAILED', error);
  }
}

/**
 * Deletes a diagram record by userId and diagramId.
 */
export async function deleteDiagram(
  userId: string,
  diagramId: string
): Promise<void> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.DIAGRAMS,
        Key: {
          PK: `USER#${userId}`,
          SK: `DIAGRAM#${diagramId}`,
        },
        ConditionExpression: 'attribute_exists(PK)',
      })
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('Diagram', diagramId);
    }
    throw new DatabaseError('Failed to delete diagram', 'DELETE_FAILED', error);
  }
}

/**
 * Lists diagrams for a user, sorted by updatedAt (most recent first).
 * Supports pagination via lastKey.
 */
export async function listUserDiagrams(
  userId: string,
  limit: number = 20,
  lastKey?: Record<string, unknown>
): Promise<PaginatedDiagrams> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.DIAGRAMS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':skPrefix': 'DIAGRAM#',
        },
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );

    return {
      items: (result.Items || []).map(itemToDiagramRecord),
      lastKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    throw new DatabaseError(
      'Failed to list user diagrams',
      'QUERY_FAILED',
      error
    );
  }
}

/**
 * Converts a raw DynamoDB item to a typed DiagramRecord.
 */
function itemToDiagramRecord(
  item: Record<string, unknown>
): DiagramRecord {
  return {
    diagramId: item.diagramId as string,
    userId: item.userId as string,
    name: item.name as string,
    prompt: item.prompt as string,
    architectureSpec: item.architectureSpec as string | undefined,
    s3Key: item.s3Key as string,
    templateId: item.templateId as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
    serviceCount: item.serviceCount as number,
    status: item.status as DiagramStatus,
  };
}
