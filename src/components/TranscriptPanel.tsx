import { cn } from '@/lib/utils';
import { Mic } from 'lucide-react';

interface TranscriptPanelProps {
  transcript: string;
  isListening: boolean;
}

export function TranscriptPanel({ transcript, isListening }: TranscriptPanelProps) {
  if (!isListening && !transcript) return null;

  return (
    <div className="mx-4 mb-2">
      <div className={cn(
        'rounded-lg border p-3 transition-colors',
        isListening ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/50'
      )}>
        <div className="flex items-center gap-2 mb-1">
          <Mic className={cn(
            'h-4 w-4',
            isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground'
          )} />
          <span className="text-xs font-medium text-muted-foreground">
            {isListening ? 'Listening...' : 'Your message'}
          </span>
        </div>
        <p className={cn(
          'text-sm',
          transcript ? 'text-foreground' : 'text-muted-foreground italic'
        )}>
          {transcript || 'Start speaking...'}
        </p>
      </div>
    </div>
  );
}
