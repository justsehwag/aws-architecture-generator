import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from './PromptInput';

describe('PromptInput', () => {
  const mockOnGenerate = vi.fn();

  beforeEach(() => {
    mockOnGenerate.mockClear();
  });

  it('renders the textarea with placeholder', () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    );
    expect(textarea).toBeInTheDocument();
  });

  it('renders the Generate Diagram button', () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    expect(
      screen.getByRole('button', { name: /generate diagram/i })
    ).toBeInTheDocument();
  });

  it('renders the Clear button', () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    expect(
      screen.getByRole('button', { name: /clear/i })
    ).toBeInTheDocument();
  });

  it('displays character count', () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    expect(screen.getByText('0 / 5000')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    );
    await userEvent.type(textarea, 'Hello World');
    expect(screen.getByText('11 / 5000')).toBeInTheDocument();
  });

  it('shows validation error for input below minimum length', async () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    );
    await userEvent.type(textarea, 'short');
    await waitFor(() => {
      expect(
        screen.getByText(/prompt must be at least 10 characters/i)
      ).toBeInTheDocument();
    });
  });

  it('does not show validation error for valid input', async () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    );
    await userEvent.type(textarea, 'A web application using EC2 and S3');
    await waitFor(() => {
      expect(
        screen.queryByText(/prompt must be at least/i)
      ).not.toBeInTheDocument();
    });
  });

  it('disables Generate button when input is empty', () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const button = screen.getByRole('button', { name: /generate diagram/i });
    expect(button).toBeDisabled();
  });

  it('disables Clear button when input is empty', () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const button = screen.getByRole('button', { name: /clear/i });
    expect(button).toBeDisabled();
  });

  it('calls onGenerate with prompt text on form submit', async () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    );
    const validPrompt = 'A web application with EC2, ALB, and RDS';
    await userEvent.type(textarea, validPrompt);
    const button = screen.getByRole('button', { name: /generate diagram/i });
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    await userEvent.click(button);
    await waitFor(() => {
      expect(mockOnGenerate).toHaveBeenCalledWith(validPrompt);
    });
  });

  it('clears the textarea when Clear button is clicked', async () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, 'A web application with EC2 and S3');
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await userEvent.click(clearButton);
    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('shows "Generating..." text when isGenerating is true', () => {
    render(<PromptInput onGenerate={mockOnGenerate} isGenerating={true} />);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('disables textarea when isGenerating is true', () => {
    render(<PromptInput onGenerate={mockOnGenerate} isGenerating={true} />);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    );
    expect(textarea).toBeDisabled();
  });

  it('renders example prompt chips', () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    expect(screen.getByText(/try an example/i)).toBeInTheDocument();
  });

  it('populates textarea when an example prompt is clicked', async () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const exampleButton = screen.getByRole('button', {
      name: /use example prompt:.*highly available/i,
    });
    await userEvent.click(exampleButton);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    ) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(textarea.value).toContain('Highly Available');
    });
  });

  it('uses defaultValue when provided', () => {
    const defaultPrompt = 'A serverless API with Lambda and DynamoDB';
    render(
      <PromptInput onGenerate={mockOnGenerate} defaultValue={defaultPrompt} />
    );
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe(defaultPrompt);
  });

  it('has proper accessibility attributes on textarea', () => {
    render(<PromptInput onGenerate={mockOnGenerate} />);
    const textarea = screen.getByPlaceholderText(
      'Describe your AWS architecture...'
    );
    expect(textarea).toHaveAttribute('id', 'prompt-input');
    const label = screen.getByText('Describe your AWS architecture');
    expect(label).toHaveAttribute('for', 'prompt-input');
  });
});
