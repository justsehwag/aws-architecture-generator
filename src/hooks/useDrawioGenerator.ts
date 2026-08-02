'use client';

import { useState, useCallback } from 'react';
import {
  generateDrawioXml,
  DrawioGenerateError,
  isDrawioGenerateError,
} from '@/services/drawio-generator';

export interface UseDrawioGeneratorReturn {
  generate: (prompt: string) => Promise<void>;
  drawioXml: string | null;
  diagramId: string | null;
  isGenerating: boolean;
  error: DrawioGenerateError | null;
  reset: () => void;
}

export function useDrawioGenerator(): UseDrawioGeneratorReturn {
  const [drawioXml, setDrawioXml] = useState<string | null>(null);
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<DrawioGenerateError | null>(null);

  const generate = useCallback(async (prompt: string): Promise<void> => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setDrawioXml(null);
    setDiagramId(null);

    try {
      const response = await generateDrawioXml({ prompt });
      setDrawioXml(response.drawioXml);
      setDiagramId(response.diagramId);
    } catch (err: unknown) {
      if (isDrawioGenerateError(err)) {
        setError(err);
      } else {
        setError({
          error: err instanceof Error ? err.message : 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating]);

  const reset = useCallback(() => {
    setDrawioXml(null);
    setDiagramId(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    generate,
    drawioXml,
    diagramId,
    isGenerating,
    error,
    reset,
  };
}
