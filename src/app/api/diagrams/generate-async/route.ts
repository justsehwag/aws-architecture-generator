/**
 * POST /api/diagrams/generate-async
 *
 * Starts an async diagram generation job.
 * Returns a jobId immediately — frontend polls /api/diagrams/jobs/[jobId] for result.
 * Uses DynamoDB to store job state across Lambda invocations.
 */

export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callLLMWithRetry } from '@/lib/llm/client';
import { buildGenerationMessages } from '@/lib/llm/prompts';
import { validateArchitectureSpec } from '@/lib/llm/schema-validator';
import { getLLMConfig } from '@/lib/llm/types';
import { generateExplanation } from '@/lib/explanation';
import { docClient, TABLE_NAMES } from '@/lib/db/client';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

const requestSchema = z.object({
  prompt: z.string().min(5).max(5000),
  templateId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = requestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid prompt', details: validation.error.issues.map(i => i.message) }, { status: 400 });
  }

  const { prompt } = validation.data;
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Store job as pending in DynamoDB
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAMES.DIAGRAMS,
      Item: {
        PK: `JOB#${jobId}`,
        SK: `JOB#${jobId}`,
        jobId,
        status: 'pending',
        prompt,
        createdAt: new Date().toISOString(),
        TTL: Math.floor(Date.now() / 1000) + 3600, // expire in 1 hour
      },
    }));
  } catch (err) {
    console.error('Failed to create job:', err);
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 });
  }

  // Start generation in background (don't await — this continues after response is sent)
  generateInBackground(jobId, prompt).catch((err) => {
    console.error(`Job ${jobId} failed:`, err);
  });

  // Return immediately
  return NextResponse.json({ jobId, status: 'pending' });
}

async function generateInBackground(jobId: string, prompt: string) {
  const llmConfig = getLLMConfig();
  const messages = buildGenerationMessages(prompt, llmConfig.model);

  try {
    const llmResponse = await callLLMWithRetry(
      messages.map(m => ({ ...m, role: m.role as 'system' | 'user' | 'assistant' })),
      llmConfig
    );

    const specValidation = validateArchitectureSpec(llmResponse.content);

    if (!specValidation.success) {
      await updateJobStatus(jobId, 'error', null, 'Failed to parse architecture');
      return;
    }

    const architectureSpec = specValidation.data;
    const diagramId = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const explanation = generateExplanation(architectureSpec);

    const result = {
      diagramId,
      architectureSpec,
      explanation,
      status: 'generating',
      serviceCount: architectureSpec.services.length,
      model: llmResponse.model,
      region: architectureSpec.region,
    };

    await updateJobStatus(jobId, 'complete', result, null);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await updateJobStatus(jobId, 'error', null, msg);
  }
}

async function updateJobStatus(jobId: string, status: string, result: unknown, error: string | null) {
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAMES.DIAGRAMS,
      Item: {
        PK: `JOB#${jobId}`,
        SK: `JOB#${jobId}`,
        jobId,
        status,
        result: result ? JSON.stringify(result) : null,
        error,
        updatedAt: new Date().toISOString(),
        TTL: Math.floor(Date.now() / 1000) + 3600,
      },
    }));
  } catch (err) {
    console.error(`Failed to update job ${jobId}:`, err);
  }
}
