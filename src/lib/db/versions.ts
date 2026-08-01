import {
  PutCommand,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  GetCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from './client';
import { NotFoundError, DatabaseError, LimitExceededError } from './errors';

/**
 * Maximum number of versions retained per diagram.
 */
export const MAX_VERSIONS_PER_DIAGRAM = 50;

/**
 * DynamoDB item shape for a version record.
 */
export interface VersionRecord {
  versionId: string;
  diagramId: string;
  name: string;
  createdBy: string;
  isAutosave: boolean;
  s3Key: string;
  createdAt: string;
}

/**
 * Input for creating a new version.
 */
export interface CreateVersionInput {
  versionId: string;
  name: string;
  createdBy: string;
  isAutosave: boolean;
  s3Key: string;
}

/**
 * Creates a new version record for a diagram.
 * The sort key uses timestamp + versionId for chronological ordering.
 */
export async function createVersion(
  diagramId: string,
  input: CreateVersionInput
): Promise<VersionRecord> {
  const now = new Date().toISOString();
  const record: VersionRecord = {
    ...input,
    diagramId,
    createdAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.VERSIONS,
        Item: {
          PK: `DIAGRAM#${diagramId}`,
          SK: `VERSION#${now}#${input.versionId}`,
          ...record,
        },
      })
    );
    return record;
  } catch (error) {
    throw new DatabaseError(
      'Failed to create version',
      'CREATE_FAILED',
      error
    );
  }
}

/**
 * Lists versions for a diagram in reverse chronological order (newest first).
 */
export async function listVersions(
  diagramId: string,
  limit: number = MAX_VERSIONS_PER_DIAGRAM
): Promise<VersionRecord[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.VERSIONS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `DIAGRAM#${diagramId}`,
          ':skPrefix': 'VERSION#',
        },
        Limit: limit,
        ScanIndexForward: false,
      })
    );

    return (result.Items || []).map(itemToVersionRecord);
  } catch (error) {
    throw new DatabaseError(
      'Failed to list versions',
      'QUERY_FAILED',
      error
    );
  }
}

/**
 * Retrieves a specific version by diagramId and versionId.
 * Queries by PK and filters by versionId since the full SK includes a timestamp.
 */
export async function getVersion(
  diagramId: string,
  versionId: string
): Promise<VersionRecord> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.VERSIONS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        FilterExpression: 'versionId = :versionId',
        ExpressionAttributeValues: {
          ':pk': `DIAGRAM#${diagramId}`,
          ':skPrefix': 'VERSION#',
          ':versionId': versionId,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      throw new NotFoundError('Version', versionId);
    }

    return itemToVersionRecord(result.Items[0]);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to get version', 'GET_FAILED', error);
  }
}

/**
 * Counts the total number of versions for a diagram.
 */
export async function countVersions(diagramId: string): Promise<number> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.VERSIONS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `DIAGRAM#${diagramId}`,
          ':skPrefix': 'VERSION#',
        },
        Select: 'COUNT',
      })
    );

    return result.Count || 0;
  } catch (error) {
    throw new DatabaseError(
      'Failed to count versions',
      'QUERY_FAILED',
      error
    );
  }
}

/**
 * Deletes the oldest autosaved version for a diagram.
 * Used for eviction when the 50-version limit is reached.
 * Named versions are never evicted before all autosaves are removed.
 *
 * @returns true if an autosave was evicted, false if no autosaves found
 * @throws LimitExceededError if no autosaves exist to evict
 */
export async function deleteOldestAutosave(
  diagramId: string
): Promise<boolean> {
  try {
    // Query versions in chronological order (oldest first)
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.VERSIONS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        FilterExpression: 'isAutosave = :isAutosave',
        ExpressionAttributeValues: {
          ':pk': `DIAGRAM#${diagramId}`,
          ':skPrefix': 'VERSION#',
          ':isAutosave': true,
        },
        ScanIndexForward: true, // oldest first
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      throw new LimitExceededError(
        `Version limit reached for diagram ${diagramId} and no autosaves available for eviction`
      );
    }

    const oldestAutosave = result.Items[0];

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.VERSIONS,
        Key: {
          PK: oldestAutosave.PK as string,
          SK: oldestAutosave.SK as string,
        },
      })
    );

    return true;
  } catch (error) {
    if (error instanceof LimitExceededError) throw error;
    throw new DatabaseError(
      'Failed to delete oldest autosave',
      'DELETE_FAILED',
      error
    );
  }
}

/**
 * Converts a raw DynamoDB item to a typed VersionRecord.
 */
function itemToVersionRecord(
  item: Record<string, unknown>
): VersionRecord {
  return {
    versionId: item.versionId as string,
    diagramId: item.diagramId as string,
    name: item.name as string,
    createdBy: item.createdBy as string,
    isAutosave: item.isAutosave as boolean,
    s3Key: item.s3Key as string,
    createdAt: item.createdAt as string,
  };
}
