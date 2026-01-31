import { cn } from '@/lib/utils';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import type { VoiceState } from '@/types/support';

interface VoiceButtonProps {
  voiceState: VoiceState;
  isListening: boolean;
  isMicAvailable: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}

export function VoiceButton({
  voiceState,
  isListening,
  isMicAvailable,
  onStartListening,
  onStopListening,
}: VoiceButtonProps) {
  const handleClick = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  const getIcon = () => {
    if (!isMicAvailable) return <MicOff className="h-8 w-8" />;
    if (voiceState === 'processing') return <Loader2 className="h-8 w-8 animate-spin" />;
    if (voiceState === 'speaking') return <Volume2 className="h-8 w-8" />;
    return <Mic className="h-8 w-8" />;
  };

  const getLabel = () => {
    if (!isMicAvailable) return 'Mic unavailable';
    if (voiceState === 'listening') return 'Listening...';
    if (voiceState === 'processing') return 'Processing...';
    if (voiceState === 'speaking') return 'Speaking...';
    return 'Tap to speak';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={!isMicAvailable || voiceState === 'processing' || voiceState === 'speaking'}
        className={cn(
          'relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300',
          'focus:outline-none focus:ring-4 focus:ring-ring focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isListening
            ? 'bg-destructive text-destructive-foreground shadow-lg scale-110'
            : 'bg-primary text-primary-foreground hover:bg-primary/90',
          voiceState === 'speaking' && 'bg-secondary text-secondary-foreground'
        )}
      >
        {/* Pulse animation when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-25" />
            <span className="absolute inset-2 rounded-full bg-destructive animate-pulse opacity-50" />
          </>
        )}
        
        {/* Speaking animation */}
        {voiceState === 'speaking' && (
          <span className="absolute inset-0 rounded-full bg-secondary animate-pulse" />
        )}
        
        <span className="relative z-10">{getIcon()}</span>
      </button>
      
      <span className={cn(
        'text-sm font-medium',
        isListening ? 'text-destructive' : 'text-muted-foreground'
      )}>
        {getLabel()}
      </span>

      {/* Audio waveform animation when listening */}
      {isListening && (
        <div className="flex items-end gap-1 h-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-1 bg-destructive rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 16 + 8}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.5s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
