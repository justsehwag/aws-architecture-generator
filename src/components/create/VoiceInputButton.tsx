'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useVoiceInput, type VoiceInputError } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

function getErrorMessage(error: VoiceInputError): string {
  switch (error) {
    case 'not-supported':
      return 'Voice input is not supported in this browser. Please type your description manually.';
    case 'not-allowed':
      return 'Microphone access was denied. Please allow microphone access and try again.';
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'network':
      return 'A network error occurred during speech recognition. Please check your connection.';
    case 'aborted':
      return 'Speech recognition was interrupted. Please try again.';
    default:
      return '';
  }
}

/**
 * Microphone button that starts/stops voice recording and provides transcript via callback.
 *
 * - Shows animated microphone icon while recording
 * - Shows error message if speech recognition fails or is unsupported
 * - Calls onTranscript(text) when transcript is available
 *
 * @validates Requirements 17.2, 17.3
 */
export function VoiceInputButton({
  onTranscript,
  disabled = false,
  className,
}: VoiceInputButtonProps) {
  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
  } = useVoiceInput();

  // Call onTranscript when we get a final transcript and stop listening
  useEffect(() => {
    if (!isListening && transcript) {
      onTranscript(transcript);
    }
  }, [isListening, transcript, onTranscript]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const errorMessage = error ? getErrorMessage(error) : '';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Button
        type="button"
        variant={isListening ? 'destructive' : 'outline'}
        size="icon"
        onClick={handleClick}
        disabled={disabled || (!isSupported && !isListening)}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        aria-pressed={isListening}
        title={
          !isSupported
            ? 'Voice input not supported in this browser'
            : isListening
              ? 'Stop recording'
              : 'Start voice input'
        }
        className="relative"
      >
        {/* Microphone icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn('h-4 w-4', isListening && 'animate-pulse')}
          aria-hidden="true"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>

        {/* Recording indicator dot */}
        {isListening && (
          <span
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-ping"
            aria-hidden="true"
          />
        )}
      </Button>

      {/* Listening status */}
      {isListening && (
        <p className="text-xs text-muted-foreground animate-pulse" role="status">
          Listening...
        </p>
      )}

      {/* Error message */}
      {errorMessage && (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
