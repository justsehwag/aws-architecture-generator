import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGenerationState } from './useGenerationState';

describe('useGenerationState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useGenerationState());

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.elapsedMs).toBe(0);
    expect(result.current.state.error).toBeNull();
    expect(result.current.isProcessing).toBe(false);
  });

  it('transitions to interpreting on startGeneration', () => {
    const { result } = renderHook(() => useGenerationState());

    act(() => {
      result.current.startGeneration();
    });

    expect(result.current.state.status).toBe('interpreting');
    expect(result.current.state.error).toBeNull();
    expect(result.current.isProcessing).toBe(true);
  });

  it('tracks elapsed time during generation', () => {
    const { result } = renderHook(() => useGenerationState());

    act(() => {
      result.current.startGeneration();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.state.elapsedMs).toBeGreaterThanOrEqual(400);
  });

  it('transitions through steps with setStep', () => {
    const { result } = renderHook(() => useGenerationState());

    act(() => {
      result.current.startGeneration();
    });

    expect(result.current.state.status).toBe('interpreting');

    act(() => {
      result.current.setStep('generating-diagram');
    });

    expect(result.current.state.status).toBe('generating-diagram');
    expect(result.current.isProcessing).toBe(true);

    act(() => {
      result.current.setStep('analyzing');
    });

    expect(result.current.state.status).toBe('analyzing');
    expect(result.current.isProcessing).toBe(true);
  });

  it('transitions to ready and stops timer', () => {
    const { result } = renderHook(() => useGenerationState());

    act(() => {
      result.current.startGeneration();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.setReady();
    });

    expect(result.current.state.status).toBe('ready');
    expect(result.current.state.error).toBeNull();
    expect(result.current.isProcessing).toBe(false);

    const elapsedAtReady = result.current.state.elapsedMs;

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Timer should be stopped, elapsed shouldn't increase
    expect(result.current.state.elapsedMs).toBe(elapsedAtReady);
  });

  it('transitions to error with error info', () => {
    const { result } = renderHook(() => useGenerationState());

    act(() => {
      result.current.startGeneration();
    });

    const error = {
      message: 'Failed to interpret prompt',
      code: 'PARSE_ERROR',
      suggestions: ['Try a simpler description', 'Include specific AWS services'],
    };

    act(() => {
      result.current.setError(error);
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.state.error).toEqual(error);
    expect(result.current.isProcessing).toBe(false);
  });

  it('resets to initial state', () => {
    const { result } = renderHook(() => useGenerationState());

    act(() => {
      result.current.startGeneration();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.setStep('generating-diagram');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.elapsedMs).toBe(0);
    expect(result.current.state.error).toBeNull();
    expect(result.current.isProcessing).toBe(false);
  });

  it('isProcessing is false for idle, ready, and error states', () => {
    const { result } = renderHook(() => useGenerationState());

    expect(result.current.isProcessing).toBe(false); // idle

    act(() => {
      result.current.startGeneration();
    });
    act(() => {
      result.current.setReady();
    });
    expect(result.current.isProcessing).toBe(false); // ready

    act(() => {
      result.current.startGeneration();
    });
    act(() => {
      result.current.setError({ message: 'error' });
    });
    expect(result.current.isProcessing).toBe(false); // error
  });
});
