/**
 * GET /api/diagrams/jobs/[jobId]
 *
 * Polls the status of an async diagram generation job from DynamoDB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { docClient, TABLE_NAMES } from '@/lib/db/client';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;

  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAMES.DIAGRAMS,
      Key: { PK: `JOB#${jobId}`, SK: `JOB#${jobId}` },
    }));

    if (!result.Item) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    const job = result.Item;

    if (job.status === 'complete' && job.result) {
      const parsed = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
      return NextResponse.json({ status: 'complete', result: parsed });
    }

    if (job.status === 'error') {
      return NextResponse.json({ status: 'error', error: job.error || 'Generation failed' });
    }

    return NextResponse.json({ status: 'pending' });
  } catch (err) {
    console.error('Failed to check job status:', err);
    return NextResponse.json({ status: 'pending' }); // Don't error, just say pending
  }
}
