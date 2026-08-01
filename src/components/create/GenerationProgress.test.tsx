import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenerationProgress } from './GenerationProgress';
import type { GenerationState } from '@/hooks/useGenerationState';

describe('GenerationProgress', () => {
  it('renders nothing when status is idle', () => {
    const state: GenerationState = { status: 'idle', elapsedMs: 0, error: null };
    const { container } = render(<GenerationProgress state={state} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders progress steps during interpreting state', () => {
    const state: GenerationState = { status: 'interpreting', elapsedMs: 2000, error: null };
    render(<GenerationProgress state={state} />);

    expect(screen.getByText('Interpreting prompt...')).toBeInTheDocument();
    expect(screen.getByText('Understanding your architecture description')).toBeInTheDocument();
    expect(screen.getByText('Generating diagram...')).toBeInTheDocument();
    expect(screen.getByText('Analyzing architecture...')).toBeInTheDocument();
  });

  it('renders progress steps during generating-diagram state', () => {
    const state: GenerationState = {
      status: 'generating-diagram',
      elapsedMs: 5000,
      error: null,
    };
    render(<GenerationProgress state={state} />);

    expect(screen.getByText('Generating diagram...')).toBeInTheDocument();
    expect(
      screen.getByText('Creating AWS architecture diagram with official icons')
    ).toBeInTheDocument();
  });

  it('renders progress steps during analyzing state', () => {
    const state: GenerationState = { status: 'analyzing', elapsedMs: 8000, error: null };
    render(<GenerationProgress state={state} />);

    expect(screen.getByText('Analyzing architecture...')).toBeInTheDocument();
    expect(
      screen.getByText('Evaluating best practices and recommendations')
    ).toBeInTheDocument();
  });

  it('renders success state when ready', () => {
    const state: GenerationState = { status: 'ready', elapsedMs: 6500, error: null };
    render(<GenerationProgress state={state} />);

    expect(screen.getByText('Diagram generated successfully')).toBeInTheDocument();
    expect(screen.getByText('6s')).toBeInTheDocument();
  });

  it('renders error state with message', () => {
    const state: GenerationState = {
      status: 'error',
      elapsedMs: 3000,
      error: {
        message: 'Failed to interpret your prompt',
        suggestions: ['Try being more specific', 'Include AWS service names'],
      },
    };
    render(<GenerationProgress state={state} />);

    expect(screen.getByText('Failed to interpret your prompt')).toBeInTheDocument();
    expect(screen.getByText('• Try being more specific')).toBeInTheDocument();
    expect(screen.getByText('• Include AWS service names')).toBeInTheDocument();
  });

  it('renders error state without suggestions', () => {
    const state: GenerationState = {
      status: 'error',
      elapsedMs: 1500,
      error: { message: 'Network error occurred' },
    };
    render(<GenerationProgress state={state} />);

    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  it('displays elapsed time in processing state', () => {
    const state: GenerationState = { status: 'interpreting', elapsedMs: 12000, error: null };
    render(<GenerationProgress state={state} />);

    expect(screen.getByText('12s')).toBeInTheDocument();
  });

  it('formats elapsed time with minutes when over 60s', () => {
    const state: GenerationState = { status: 'generating-diagram', elapsedMs: 75000, error: null };
    render(<GenerationProgress state={state} />);

    expect(screen.getByText('1m 15s')).toBeInTheDocument();
  });

  it('has proper aria-live region for screen readers during processing', () => {
    const state: GenerationState = { status: 'interpreting', elapsedMs: 1000, error: null };
    render(<GenerationProgress state={state} />);

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('has proper aria-live region for error state', () => {
    const state: GenerationState = {
      status: 'error',
      elapsedMs: 0,
      error: { message: 'Something went wrong' },
    };
    render(<GenerationProgress state={state} />);

    const alertRegion = screen.getByRole('alert');
    expect(alertRegion).toHaveAttribute('aria-live', 'assertive');
  });

  it('has proper aria-live region for ready state', () => {
    const state: GenerationState = { status: 'ready', elapsedMs: 5000, error: null };
    render(<GenerationProgress state={state} />);

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
  });
});
