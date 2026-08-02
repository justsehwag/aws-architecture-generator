/**
 * POST /api/diagrams/generate-async
 *
 * Starts an async diagram generation job.
 * Returns a jobId immediately — frontend polls /api/diagrams/jobs/[jobId] for result.
 * This eliminates timeout issues regardless of model speed.
 */

export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callLLMWithRetry } from '@/lib/llm/client';
import { buildGenerationMessages } from '@/lib/llm/prompts';
import { validateArchitectureSpec } from '@/lib/llm/schema-validator';
import { getLLMConfig } from '@/lib/llm/types';
import { generateExplanation } from '@/lib/explanation';
import { getJobStore } from '../jobs/[jobId]/route';

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
  const jobs = getJobStore();

  // Store job as pending
  jobs.set(jobId, { status: 'pending' });

  // Start the generation in background (don't await)
  generateInBackground(jobId, prompt, jobs).catch((err) => {
    jobs.set(jobId, { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
  });

  // Return immediately with jobId
  return NextResponse.json({ jobId, status: 'pending' });
}

async function generateInBackground(jobId: string, prompt: string, jobs: Map<string, unknown>) {
  const llmConfig = getLLMConfig();
  const messages = buildGenerationMessages(prompt, llmConfig.model);

  const llmResponse = await callLLMWithRetry(
    messages.map(m => ({ ...m, role: m.role as 'system' | 'user' | 'assistant' })),
    llmConfig
  );

  const specValidation = validateArchitectureSpec(llmResponse.content);

  if (!specValidation.success) {
    jobs.set(jobId, { status: 'error', error: 'Failed to parse architecture specification' });
    return;
  }

  const architectureSpec = specValidation.data;
  const diagramId = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const explanation = generateExplanation(architectureSpec);

  jobs.set(jobId, {
    status: 'complete',
    result: {
      diagramId,
      architectureSpec,
      explanation,
      status: 'generating',
      serviceCount: architectureSpec.services.length,
      model: llmResponse.model,
      region: architectureSpec.region,
    },
  });
}
