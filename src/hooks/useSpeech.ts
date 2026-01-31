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
  const [isMicAvailable, setIsMicAvailable] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsMicAvailable(false);
      setErrorMessage('Voice input not supported in this browser. Please use the text input.');
      return;
    }

    // Check microphone permission
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => {
        setIsMicAvailable(true);
        setErrorMessage(null);
      })
      .catch(() => {
        setIsMicAvailable(false);
        setErrorMessage('Microphone access denied. Please allow microphone access or use text input.');
      });
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsMicAvailable(false);
      setErrorMessage('Voice input not supported. Please use text input instead.');
      return;
    }

    // Clear previous error
    setErrorMessage(null);
    retryCountRef.current = 0;

    // Stop any ongoing speech
    window.speechSynthesis?.cancel();
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Changed to false for more reliable results
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setVoiceState('listening');
      setTranscript('');
      setErrorMessage(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Always update with the latest transcript
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      } else if (interimTranscript) {
        // For interim results, show what we have so far
        setTranscript(interimTranscript);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      // Handle different error types
      switch (event.error) {
        case 'not-allowed':
          setIsMicAvailable(false);
          setErrorMessage('Microphone access denied. Please allow access in browser settings.');
          setVoiceState('idle');
          break;
        case 'network':
          // Network errors are common in iframes/preview - retry a few times
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(`Network error, retrying... (${retryCountRef.current}/${maxRetries})`);
            // Brief delay before retry
            setTimeout(() => {
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch {
                  // Already started or other issue
                  setVoiceState('idle');
                  setErrorMessage('Voice recognition unavailable. Please use text input.');
                }
              }
            }, 500);
          } else {
            setVoiceState('idle');
            setErrorMessage('Voice recognition unavailable in this context. Please use the text input below.');
          }
          break;
        case 'no-speech':
          setVoiceState('idle');
          setErrorMessage('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setVoiceState('idle');
          setErrorMessage('No microphone found. Please connect a microphone or use text input.');
          break;
        case 'aborted':
          // User aborted, no error message needed
          setVoiceState('idle');
          break;
        default:
          setVoiceState('idle');
          setErrorMessage('Voice recognition error. Please use text input.');
      }
    };

    recognition.onend = () => {
      // Only set to idle if we're not in a retry cycle
      if (retryCountRef.current >= maxRetries || retryCountRef.current === 0) {
        setVoiceState('idle');
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setVoiceState('idle');
      setErrorMessage('Failed to start voice input. Please use text input.');
    }
  }, []);

  const stopListening = useCallback(() => {
    retryCountRef.current = maxRetries; // Prevent retries
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
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
    setErrorMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      retryCountRef.current = maxRetries;
      recognitionRef.current?.stop();
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
