import { useState, useCallback, useRef, useEffect } from 'react';
import type { VoiceState } from '@/types/support';

interface UseSpeechReturn {
  voiceState: VoiceState;
  transcript: string;
  isListening: boolean;
  isSpeaking: boolean;
  isMicAvailable: boolean;
  isMuted: boolean;
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
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsMicAvailable(false);
      return;
    }

    // Check microphone permission
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => setIsMicAvailable(true))
      .catch(() => setIsMicAvailable(false));
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsMicAvailable(false);
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis?.cancel();
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setVoiceState('listening');
      setTranscript('');
    };

    recognition.onresult = (event) => {
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

      setTranscript(prev => {
        if (finalTranscript) {
          return prev + finalTranscript;
        }
        return prev + interimTranscript;
      });
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsMicAvailable(false);
      }
      setVoiceState('idle');
    };

    recognition.onend = () => {
      if (voiceState === 'listening') {
        setVoiceState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [voiceState]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleMute,
    clearTranscript,
  };
}
