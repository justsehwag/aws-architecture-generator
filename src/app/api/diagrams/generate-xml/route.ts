/**
 * POST /api/diagrams/generate-xml
 *
 * Generates professional Draw.io XML directly from a prompt.
 * Uses the LLM to produce complete mxfile XML with AWS4 shapes,
 * containers, and proper layout.
 */

// Max execution time
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { callLLMWithRetry } from '@/lib/llm/client';
import { buildDrawioMessages } from '@/lib/llm/drawio-prompt';
import { getLLMConfig } from '@/lib/llm/types';

export async function POST(request: NextRequest) {
  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const prompt = body.prompt;
  if (!prompt || prompt.length < 5) {
    return NextResponse.json({ error: 'Prompt is required (min 5 chars)' }, { status: 400 });
  }

  const llmConfig = getLLMConfig();
  if (!llmConfig.apiKey && llmConfig.provider !== 'bedrock') {
    return NextResponse.json({ error: 'LLM not configured' }, { status: 503 });
  }

  const messages = buildDrawioMessages(prompt);

  try {
    const response = await callLLMWithRetry(
      messages.map(m => ({ ...m, role: m.role as 'system' | 'user' | 'assistant' })),
      llmConfig
    );

    let xml = response.content.trim();

    // Strip markdown fences if present
    xml = xml.replace(/^```(?:xml)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    // Validate it looks like Draw.io XML
    if (!xml.includes('<mxfile') && !xml.includes('<mxGraphModel')) {
      return NextResponse.json({
        error: 'LLM did not produce valid Draw.io XML',
        code: 'PARSE_FAILURE',
      }, { status: 422 });
    }

    const diagramId = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    return NextResponse.json({
      diagramId,
      drawioXml: xml,
      model: response.model,
      name: extractDiagramName(prompt),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `AI error: ${msg}`, code: 'LLM_ERROR' }, { status: 502 });
  }
}

function extractDiagramName(prompt: string): string {
  // Use first 50 chars of prompt as diagram name
  const cleaned = prompt.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
}
