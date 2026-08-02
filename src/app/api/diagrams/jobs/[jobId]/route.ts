/**
 * GET /api/diagrams/jobs/[jobId]
 *
 * Polls the status of an async diagram generation job.
 * Returns the result when the job is complete.
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory job store (for Amplify SSR — same process handles both start and poll)
// For production, this should be DynamoDB
const globalJobs = (globalThis as unknown as { __diagramJobs?: Map<string, unknown> });
if (!globalJobs.__diagramJobs) {
  globalJobs.__diagramJobs = new Map();
}

export function getJobStore(): Map<string, unknown> {
  return globalJobs.__diagramJobs!;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  const jobs = getJobStore();
  const job = jobs.get(jobId) as { status: string; result?: unknown; error?: string } | undefined;

  if (!job) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  if (job.status === 'complete') {
    // Clean up after delivery
    jobs.delete(jobId);
    return NextResponse.json({ status: 'complete', result: job.result });
  }

  if (job.status === 'error') {
    jobs.delete(jobId);
    return NextResponse.json({ status: 'error', error: job.error }, { status: 500 });
  }

  return NextResponse.json({ status: 'pending' });
}
