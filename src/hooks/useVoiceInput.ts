'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceInputError =
  | 'not-supported'
  | 'not-allowed'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | null;

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: VoiceInputError;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

/**
 * Hook that provides voice input via the browser Speech Recognition API.
 *
 * - Uses window.SpeechRecognition or window.webkitSpeechRecognition
 * - Returns transcript, listening state, error state, and control functions
 * - Auto-stops after 30 seconds of silence or 5 seconds after speech ends
 * - If browser doesn't support Speech Recognition, isSupported = false
 *
 * @validates Requirements 17.2, 17.3
 */
export function useVoiceInput(language: string = 'en-US'): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<VoiceInputError>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported = typeof window !== 'undefined' && !!(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current);
      speechEndTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearTimers();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, [clearTimers]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('not-supported');
      return;
    }

    // Reset state
    setError(null);
    setTranscript('');

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);

      // Auto-stop after 30 seconds of silence (no results)
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, 30000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reset the silence timer on any result
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show the combined transcript (final + interim)
      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onspeechend = () => {
      // Auto-stop 5 seconds after speech ends
      speechEndTimerRef.current = setTimeout(() => {
        stopListening();
      }, 5000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearTimers();
      setIsListening(false);

      switch (event.error) {
        case 'not-allowed':
          setError('not-allowed');
          break;
        case 'no-speech':
          setError('no-speech');
          break;
        case 'network':
          setError('network');
          break;
        case 'aborted':
          setError('aborted');
          break;
        default:
          setError('network');
          break;
      }
    };

    recognition.onend = () => {
      clearTimers();
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch {
      setError('not-supported');
      setIsListening(false);
    }
  }, [isSupported, language, stopListening, clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [clearTimers]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
  };
}
