'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const EXAMPLE_PROMPTS = [
  'Highly Available Web Application with CloudFront, ALB, ECS Fargate, Aurora Multi-AZ',
  'Serverless Image Processing with S3, Lambda, Rekognition, DynamoDB',
  'AI Chatbot using Amazon Bedrock, API Gateway, Lambda, DynamoDB',
  'Data Lake with S3, Glue, Athena, QuickSight, Lake Formation',
  'Microservices with EKS, MSK, ElastiCache, RDS',
] as const;

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function ExamplePrompts({ onSelect, disabled }: ExamplePromptsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Try an example:
      </p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium',
              'bg-secondary text-secondary-foreground',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'transition-colors',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
            aria-label={`Use example prompt: ${prompt}`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export { EXAMPLE_PROMPTS };
