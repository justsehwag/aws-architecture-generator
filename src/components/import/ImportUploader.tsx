/**
 * ImportUploader Component
 *
 * Provides drag-and-drop zone and file picker button for importing .drawio files.
 * Validates file extension and size client-side before uploading.
 * Shows progress indicator during upload and error display for invalid files.
 *
 * Validates: Requirements 15.1, 15.3, 15.4, 15.5
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.drawio'];

export interface ImportResult {
  diagramId: string;
  name: string;
  fileName: string;
  fileSizeBytes: number;
  status: string;
  message: string;
}

export interface ImportUploaderProps {
  /** Called when import succeeds with the result from the API */
  onImportSuccess?: (result: ImportResult) => void;
  /** Called when import fails with the error message */
  onImportError?: (error: string) => void;
  /** Optional CSS class name */
  className?: string;
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

export function ImportUploader({
  onImportSuccess,
  onImportError,
  className = '',
}: ImportUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validates the selected file client-side before upload.
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext)
    );
    if (!hasValidExtension) {
      return `Invalid file type. Please select a .drawio file.`;
    }

    // Check size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`;
    }

    if (file.size === 0) {
      return 'The selected file is empty.';
    }

    return null;
  }, []);

  /**
   * Handles file selection from input or drop.
   */
  const handleFileSelected = useCallback(
    async (file: File) => {
      setError(null);
      setSelectedFile(file);
      setUploadState('validating');
      setProgress(0);

      // Client-side validation
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setUploadState('error');
        onImportError?.(validationError);
        return;
      }

      // Proceed with upload
      setUploadState('uploading');
      setProgress(30);

      try {
        const formData = new FormData();
        formData.append('file', file);

        setProgress(50);

        const response = await fetch('/api/diagrams/import', {
          method: 'POST',
          body: formData,
        });

        setProgress(80);

        const result = await response.json();

        if (!response.ok) {
          const errorMsg = result.error || 'Import failed. Please try again.';
          setError(errorMsg);
          setUploadState('error');
          onImportError?.(errorMsg);
          return;
        }

        setProgress(100);
        setUploadState('success');
        onImportSuccess?.(result as ImportResult);
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? `Upload failed: ${err.message}`
            : 'Upload failed. Please check your connection and try again.';
        setError(errorMsg);
        setUploadState('error');
        onImportError?.(errorMsg);
      }
    },
    [validateFile, onImportSuccess, onImportError]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelected(files[0]);
      }
    },
    [handleFileSelected]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelected(files[0]);
      }
    },
    [handleFileSelected]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setUploadState('idle');
    setError(null);
    setSelectedFile(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".drawio"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Select a .drawio file to import"
      />

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Drop zone for .drawio file import. Click or drag a file here."
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        className={`
          relative flex flex-col items-center justify-center 
          rounded-lg border-2 border-dashed p-8 transition-colors
          cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${uploadState === 'error' ? 'border-red-300 dark:border-red-700' : ''}
          ${uploadState === 'success' ? 'border-green-300 dark:border-green-700' : ''}
        `}
      >
        {/* Icon */}
        {uploadState === 'idle' && (
          <Upload
            className="mb-3 h-10 w-10 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        )}
        {uploadState === 'validating' && (
          <Loader2
            className="mb-3 h-10 w-10 animate-spin text-blue-500"
            aria-hidden="true"
          />
        )}
        {uploadState === 'uploading' && (
          <FileUp
            className="mb-3 h-10 w-10 text-blue-500"
            aria-hidden="true"
          />
        )}
        {uploadState === 'error' && (
          <AlertCircle
            className="mb-3 h-10 w-10 text-red-500"
            aria-hidden="true"
          />
        )}
        {uploadState === 'success' && (
          <CheckCircle2
            className="mb-3 h-10 w-10 text-green-500"
            aria-hidden="true"
          />
        )}

        {/* Text content */}
        {uploadState === 'idle' && (
          <>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Drag and drop a .drawio file here
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              or{' '}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                browse files
              </button>
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Maximum file size: {MAX_FILE_SIZE_MB} MB
            </p>
          </>
        )}

        {(uploadState === 'validating' || uploadState === 'uploading') && selectedFile && (
          <div className="text-center">
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {uploadState === 'validating' ? 'Validating...' : 'Uploading...'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
            {/* Progress bar */}
            <div className="mt-3 w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress: ${progress}%`}
              />
            </div>
          </div>
        )}

        {uploadState === 'success' && selectedFile && (
          <div className="text-center">
            <p className="mb-1 text-sm font-medium text-green-700 dark:text-green-400">
              Import successful!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedFile.name} imported and ready for analysis
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Import another file
            </button>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="text-center">
            <p className="mb-1 text-sm font-medium text-red-700 dark:text-red-400">
              Import failed
            </p>
            {selectedFile && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {selectedFile.name}
              </p>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Error message display */}
      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3"
        >
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
