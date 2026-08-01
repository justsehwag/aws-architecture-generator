'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { ExamplePrompts } from './ExamplePrompts';
import {
  promptSchema,
  PROMPT_MAX_LENGTH,
  PROMPT_MIN_LENGTH,
  type PromptFormValues,
} from '@/lib/validation/prompt-schema';
import { cn } from '@/lib/utils';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating?: boolean;
  defaultValue?: string;
}

export function PromptInput({
  onGenerate,
  isGenerating = false,
  defaultValue = '',
}: PromptInputProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    mode: 'onChange',
    defaultValues: {
      prompt: defaultValue,
    },
  });

  const promptValue = watch('prompt');
  const charCount = promptValue?.length ?? 0;

  const onSubmit = (data: PromptFormValues) => {
    onGenerate(data.prompt);
  };

  const handleClear = () => {
    reset({ prompt: '' });
  };

  const handleExampleSelect = (example: string) => {
    setValue('prompt', example, { shouldValidate: true });
  };

  const isOverLimit = charCount > PROMPT_MAX_LENGTH;
  const isUnderLimit = charCount > 0 && charCount < PROMPT_MIN_LENGTH;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="prompt-input"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Describe your AWS architecture
        </label>
        <div className="relative">
          <textarea
            id="prompt-input"
            placeholder="Describe your AWS architecture..."
            rows={6}
            disabled={isGenerating}
            aria-invalid={!!errors.prompt}
            aria-describedby={
              errors.prompt ? 'prompt-error' : 'prompt-char-count'
            }
            className={cn(
              'flex w-full rounded-md border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'resize-y min-h-[150px]',
              errors.prompt
                ? 'border-destructive focus-visible:ring-destructive'
                : 'border-input'
            )}
            {...register('prompt')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            {errors.prompt && (
              <p
                id="prompt-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.prompt.message}
              </p>
            )}
          </div>
          <p
            id="prompt-char-count"
            className={cn(
              'text-sm tabular-nums',
              isOverLimit
                ? 'text-destructive'
                : isUnderLimit
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground'
            )}
            aria-live="polite"
          >
            {charCount} / {PROMPT_MAX_LENGTH}
          </p>
        </div>
      </div>

      <ExamplePrompts onSelect={handleExampleSelect} disabled={isGenerating} />

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isGenerating || !isValid || charCount === 0}
          className="min-w-[160px]"
        >
          {isGenerating ? 'Generating...' : 'Generate Diagram'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={isGenerating || charCount === 0}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
