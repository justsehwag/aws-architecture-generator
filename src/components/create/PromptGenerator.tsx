'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PromptGeneratorProps {
  onPromptGenerated: (prompt: string) => void;
  isDisabled?: boolean;
}

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.pdf', '.txt', '.json', '.eml'];
const ACCEPTED_MIME_TYPES =
  '.csv,.xlsx,.pdf,.txt,.json,.eml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,text/plain,application/json,message/rfc822';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const LAMBDA_URL =
  process.env.NEXT_PUBLIC_DRAWIO_GENERATOR_URL ||
  'https://x4wedmmebyam6gdotufkbhfrfm0hkmwx.lambda-url.ap-south-1.on.aws/';

const SYSTEM_INSTRUCTION = `You are an AWS migration and architecture expert. Analyze the following infrastructure inventory, billing data, or documentation. This may include on-premises servers, Azure services, GCP services, or any other cloud/infrastructure data.

Your job:
1. Identify all services, workloads, and their relationships
2. Map each service to the BEST equivalent AWS service (e.g., Azure App Service → AWS Elastic Beanstalk/ECS, GCP Cloud Functions → AWS Lambda, Azure SQL → Amazon RDS, GCP BigQuery → Amazon Redshift/Athena)
3. Generate a detailed AWS architecture description prompt that includes:
   - All AWS services needed
   - Network topology (VPC, subnets, availability zones)
   - Data flow and connections between services
   - Security groups and access patterns
   - Storage and database services

Output ONLY the architecture prompt text (no explanation, no preamble). The prompt should be ready to generate a Draw.io diagram.

Content to analyze:

`;

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

function validateFile(file: File): FileValidationResult {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File exceeds the 5MB size limit',
    };
  }
  return { valid: true };
}

export function PromptGenerator({ onPromptGenerated, isDisabled = false }: PromptGeneratorProps) {
  const [pastedContent, setPastedContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedContent, setUploadedContent] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [userInstructions, setUserInstructions] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    setFileError(null);
    setAnalyzeError(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.error!);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setUploadedFile(file);
      setUploadedContent(content);
    };
    reader.onerror = () => {
      setFileError('Unable to read file. Please try a different file.');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setUploadedContent('');
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleGeneratePrompt = useCallback(async () => {
    const content = uploadedContent || pastedContent;
    if (!content.trim()) return;

    const fullContent = userInstructions.trim()
      ? `${content}\n\n--- User Instructions ---\n${userInstructions.trim()}`
      : content;

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: SYSTEM_INSTRUCTION + fullContent,
          mode: 'chat',
          conversationHistory: [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze content');
      }

      const data = await response.json();
      const generatedPrompt = data.response || data.drawioXml || '';

      if (generatedPrompt) {
        onPromptGenerated(generatedPrompt);
      } else {
        setAnalyzeError('Failed to analyze content. Please try again.');
      }
    } catch {
      setAnalyzeError('Failed to analyze content. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedContent, pastedContent, userInstructions, onPromptGenerated]);

  const hasContent = !!(uploadedContent || pastedContent.trim());

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          Upload your infrastructure inventory, cloud bills, or configuration exports from
          <strong> any platform</strong> (on-prem, Azure, GCP, AWS). I&apos;ll map everything
          to AWS services and generate an architecture prompt.
        </p>
        <p>Examples of what you can upload:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>Server inventory spreadsheet (CSV/Excel)</li>
          <li>Azure/GCP billing export or resource list (CSV/JSON)</li>
          <li>Cloud configuration export (JSON/TXT)</li>
          <li>Migration planning document (PDF/TXT)</li>
          <li>Email thread discussing infrastructure requirements (EML)</li>
        </ul>
      </div>

      {/* File Upload Area */}
      <div>
        <label className="text-sm font-medium leading-none mb-2 block">
          Upload infrastructure file
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_MIME_TYPES}
            onChange={handleInputChange}
            className="hidden"
            disabled={isDisabled || isAnalyzing}
          />
          {uploadedFile ? (
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">{uploadedFile.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="ml-2 p-1 rounded-full hover:bg-muted"
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                Drag & drop a file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Accepts: {ACCEPTED_EXTENSIONS.join(', ')} (max 5MB)
              </p>
            </>
          )}
        </div>
        {fileError && (
          <p className="text-sm text-destructive mt-2" role="alert">
            {fileError}
          </p>
        )}
      </div>

      {/* Paste Content Area */}
      <div>
        <label htmlFor="paste-content" className="text-sm font-medium leading-none mb-2 block">
          Or paste content directly
        </label>
        <textarea
          id="paste-content"
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          placeholder="Paste your infrastructure inventory, documentation, or configuration here..."
          rows={6}
          disabled={isDisabled || isAnalyzing}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-y min-h-[120px]'
          )}
        />
      </div>

      {/* Additional Instructions */}
      <div>
        <label htmlFor="user-instructions" className="text-sm font-medium leading-none mb-2 block">
          Additional instructions (optional)
        </label>
        <textarea
          id="user-instructions"
          value={userInstructions}
          onChange={(e) => setUserInstructions(e.target.value)}
          placeholder="E.g., 'Migrate this to serverless architecture', 'Focus on cost optimization', 'Include multi-AZ setup for high availability'..."
          rows={3}
          disabled={isDisabled || isAnalyzing}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-y min-h-[80px]'
          )}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Tell us what you&apos;d like to do with this inventory — migrate, modernize, optimize, etc.
        </p>
      </div>

      {/* Generate Prompt Button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleGeneratePrompt}
          disabled={!hasContent || isAnalyzing || isDisabled}
          className="min-w-[160px]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing your content...
            </>
          ) : (
            'Generate Prompt'
          )}
        </Button>
      </div>

      {/* Error */}
      {analyzeError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-destructive">{analyzeError}</p>
          <button
            type="button"
            onClick={handleGeneratePrompt}
            className="text-sm text-primary underline mt-1"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
