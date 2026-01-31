import { useState, useCallback, useRef, useEffect } from 'react';
import type { VoiceState } from '@/types/support';

interface UseSpeechReturn {
  voiceState: VoiceState;
  transcript: string;
  isListening: boolean;
  isSpeaking: boolean;
  isMicAvailable: boolean;
  isMuted: boolean;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  toggleMute: () => void;
  clearTranscript: () => void;
}

export function useSpeech(): UseSpeechReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check browser support once - this is the only thing that permanently disables mic
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const [isMicAvailable, setIsMicAvailable] = useState(!!SpeechRecognition);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isListeningRef = useRef(false); // Track user intent to listen
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef(''); // Track accumulated final transcript

  // Clear error after a delay
  const clearErrorAfterDelay = useCallback((delay = 3000) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMessage(null);
    }, delay);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setIsMicAvailable(false);
      setErrorMessage('Voice input not supported in this browser.');
      return;
    }

    // Clear any previous error
    setErrorMessage(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    // Stop any ongoing speech
    window.speechSynthesis?.cancel();

    // Mark that user wants to listen
    isListeningRef.current = true;

    // Reuse existing recognition or create new one
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let fullFinal = '';
        let currentInterim = '';

        // Build complete transcript from all results (not just from resultIndex)
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            fullFinal += result[0].transcript;
          } else {
            currentInterim += result[0].transcript;
          }
        }

        // Store final transcript for submission
        finalTranscriptRef.current = fullFinal;

        // Display full final + current interim
        setTranscript(fullFinal + currentInterim);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        switch (event.error) {
          case 'not-allowed':
            // This is the ONLY error that permanently disables mic
            setIsMicAvailable(false);
            setErrorMessage('Microphone access denied. Please allow access in browser settings.');
            isListeningRef.current = false;
            setVoiceState('idle');
            recognitionRef.current = null;
            break;
          case 'network':
            // Soft error - show message but allow retry
            setErrorMessage('Network error. Tap mic to try again.');
            clearErrorAfterDelay();
            isListeningRef.current = false;
            setVoiceState('idle');
            recognitionRef.current = null;
            break;
          case 'no-speech':
            // Soft error - common, just show brief message
            setErrorMessage('No speech detected. Tap mic to try again.');
            clearErrorAfterDelay();
            isListeningRef.current = false;
            setVoiceState('idle');
            break;
          case 'audio-capture':
            // Soft error - mic might be in use
            setErrorMessage('Could not capture audio. Check your microphone.');
            clearErrorAfterDelay(5000);
            isListeningRef.current = false;
            setVoiceState('idle');
            recognitionRef.current = null;
            break;
          case 'aborted':
            // User or system aborted - no message needed
            isListeningRef.current = false;
            setVoiceState('idle');
            break;
          default:
            // Unknown error - soft failure
            setErrorMessage('Voice error. Tap mic to try again.');
            clearErrorAfterDelay();
            isListeningRef.current = false;
            setVoiceState('idle');
            recognitionRef.current = null;
        }
      };

      recognition.onend = () => {
        // Only restart if user still wants to listen and we haven't hit a hard error
        if (isListeningRef.current && isMicAvailable) {
          try {
            recognition.start();
          } catch {
            // Failed to restart - stop gracefully
            isListeningRef.current = false;
            setVoiceState('idle');
          }
        } else {
          setVoiceState('idle');
        }
      };

      recognitionRef.current = recognition;
    }

    try {
      setVoiceState('listening');
      setTranscript('');
      finalTranscriptRef.current = '';
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      // If already started, that's fine - just update state
      if ((e as Error).message?.includes('already started')) {
        setVoiceState('listening');
      } else {
        setErrorMessage('Failed to start voice input. Tap to try again.');
        clearErrorAfterDelay();
        setVoiceState('idle');
      }
    }
  }, [SpeechRecognition, isMicAvailable, clearErrorAfterDelay]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
    }
    setVoiceState('idle');
  }, []);

  const speak = useCallback((text: string) => {
    if (isMuted || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Google') ||
      v.name.includes('Natural') ||
      v.name.includes('Samantha')
    ) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setVoiceState('speaking');
    };

    utterance.onend = () => {
      setVoiceState('idle');
    };

    utterance.onerror = () => {
      setVoiceState('idle');
    };

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setVoiceState('idle');
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (!isMuted) {
      window.speechSynthesis?.cancel();
    }
  }, [isMuted]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      try {
        recognitionRef.current?.stop();
      } catch {
        // Already stopped
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    voiceState,
    transcript,
    isListening: voiceState === 'listening',
    isSpeaking: voiceState === 'speaking',
    isMicAvailable,
    isMuted,
    errorMessage,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleMute,
    clearTranscript,
  };
}
