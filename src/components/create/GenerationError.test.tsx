import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerationError } from './GenerationError';
import type { GenerationError as GenerationErrorData } from '@/lib/errors/generation-errors';

describe('GenerationError', () => {
  const parseError: GenerationErrorData = {
    type: 'parse',
    message: "We couldn't interpret your architecture description.",
    suggestions: [
      'Try naming services explicitly',
      'Describe as a use case',
      'Start from a pattern',
    ],
    retryable: false,
  };

  const timeoutError: GenerationErrorData = {
    type: 'timeout',
    message: 'Generation is taking longer than expected.',
    retryable: true,
  };

  const apiError: GenerationErrorData = {
    type: 'api',
    message: 'Something went wrong on our end. Please try again shortly.',
    statusCode: 500,
    retryable: true,
  };

  const networkError: GenerationErrorData = {
    type: 'network',
    message: 'Network connection lost. Your changes have been saved locally.',
    retryable: true,
  };

  it('renders with role="alert" for accessibility', () => {
    render(<GenerationError error={parseError} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays the error message', () => {
    render(<GenerationError error={apiError} />);
    expect(
      screen.getByText('Something went wrong on our end. Please try again shortly.')
    ).toBeInTheDocument();
  });

  describe('parse error variant', () => {
    it('displays up to 3 alternative prompt suggestions', () => {
      render(<GenerationError error={parseError} />);
      expect(screen.getByText('Try one of these approaches:')).toBeInTheDocument();
      expect(screen.getByText('Try naming services explicitly')).toBeInTheDocument();
      expect(screen.getByText('Describe as a use case')).toBeInTheDocument();
      expect(screen.getByText('Start from a pattern')).toBeInTheDocument();
    });

    it('does not show retry button when not retryable', () => {
      render(<GenerationError error={parseError} onRetry={() => {}} />);
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('timeout error variant', () => {
    it('shows retry button', () => {
      render(<GenerationError error={timeoutError} onRetry={() => {}} />);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = vi.fn();
      render(<GenerationError error={timeoutError} onRetry={onRetry} />);
      await userEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledOnce();
    });
  });

  describe('api error variant', () => {
    it('shows retry button for 5xx errors', () => {
      render(<GenerationError error={apiError} onRetry={() => {}} />);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('network error variant', () => {
    it('displays network error message', () => {
      render(<GenerationError error={networkError} />);
      expect(
        screen.getByText('Network connection lost. Your changes have been saved locally.')
      ).toBeInTheDocument();
    });

    it('shows retry button', () => {
      render(<GenerationError error={networkError} onRetry={() => {}} />);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('retry loading state', () => {
    it('shows loading state when retrying', () => {
      render(
        <GenerationError error={timeoutError} onRetry={() => {}} isRetrying={true} />
      );
      const button = screen.getByRole('button', { name: /retrying/i });
      expect(button).toBeDisabled();
    });

    it('does not show retry button when onRetry is not provided', () => {
      render(<GenerationError error={timeoutError} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
