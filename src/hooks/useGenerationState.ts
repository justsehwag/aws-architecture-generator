'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type GenerationStatus =
  | 'idle'
  | 'interpreting'
  | 'generating-diagram'
  | 'analyzing'
  | 'ready'
  | 'error';

export interface GenerationError {
  message: string;
  code?: string;
  suggestions?: string[];
}

export interface GenerationState {
  status: GenerationStatus;
  elapsedMs: number;
  error: GenerationError | null;
}

export interface UseGenerationStateReturn {
  state: GenerationState;
  isProcessing: boolean;
  startGeneration: () => void;
  setStep: (step: Extract<GenerationStatus, 'interpreting' | 'generating-diagram' | 'analyzing'>) => void;
  setReady: () => void;
  setError: (error: GenerationError) => void;
  reset: () => void;
}

const INITIAL_STATE: GenerationState = {
  status: 'idle',
  elapsedMs: 0,
  error: null,
};

export function useGenerationState(): UseGenerationStateReturn {
  const [state, setState] = useState<GenerationState>(INITIAL_STATE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setState((prev) => ({
          ...prev,
          elapsedMs: Date.now() - startTimeRef.current!,
        }));
      }
    }, 100);
  }, [stopTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  const startGeneration = useCallback(() => {
    setState({
      status: 'interpreting',
      elapsedMs: 0,
      error: null,
    });
    startTimer();
  }, [startTimer]);

  const setStep = useCallback(
    (step: Extract<GenerationStatus, 'interpreting' | 'generating-diagram' | 'analyzing'>) => {
      setState((prev) => ({
        ...prev,
        status: step,
        error: null,
      }));
    },
    []
  );

  const setReady = useCallback(() => {
    stopTimer();
    setState((prev) => ({
      ...prev,
      status: 'ready',
      error: null,
    }));
  }, [stopTimer]);

  const setError = useCallback(
    (error: GenerationError) => {
      stopTimer();
      setState((prev) => ({
        ...prev,
        status: 'error',
        error,
      }));
    },
    [stopTimer]
  );

  const reset = useCallback(() => {
    stopTimer();
    setState(INITIAL_STATE);
  }, [stopTimer]);

  const isProcessing =
    state.status === 'interpreting' ||
    state.status === 'generating-diagram' ||
    state.status === 'analyzing';

  return {
    state,
    isProcessing,
    startGeneration,
    setStep,
    setReady,
    setError,
    reset,
  };
}
