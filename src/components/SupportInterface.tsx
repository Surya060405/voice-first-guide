import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceButton } from './VoiceButton';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TranscriptPanel } from './TranscriptPanel';
import { useSpeech } from '@/hooks/useSpeech';
import { useConversation } from '@/hooks/useConversation';
import { LogOut, Trash2, VolumeX, Volume2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupportInterfaceProps {
  customerId: string;
  onLogout: () => void;
}

export function SupportInterface({ customerId, onLogout }: SupportInterfaceProps) {
  const { toast } = useToast();
  const {
    voiceState,
    transcript,
    isListening,
    isMicAvailable,
    isMuted,
    errorMessage: voiceError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleMute,
    clearTranscript,
  } = useSpeech();

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    initSession,
  } = useConversation();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const transcriptRef = useRef('');

  // Keep transcriptRef in sync with transcript state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Initialize session
  useEffect(() => {
    initSession(customerId);
  }, [customerId, initSession]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Show error toast for API errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Handle voice message submission
  const handleVoiceSubmit = useCallback(async () => {
    if (!transcript.trim() || processingRef.current) return;

    processingRef.current = true;
    const message = transcript.trim();
    clearTranscript();

    try {
      const response = await sendMessage(message);
      speak(response);
    } catch {
      // Error is handled by the hook
    } finally {
      processingRef.current = false;
    }
  }, [transcript, clearTranscript, sendMessage, speak]);

  // Handle stop listening - submit if there's transcript
  const handleStopListening = useCallback(() => {
    stopListening();
    // Use ref to get current transcript value (avoids stale closure)
    const currentTranscript = transcriptRef.current;
    if (currentTranscript.trim()) {
      handleVoiceSubmit();
    }
  }, [stopListening, handleVoiceSubmit]);

  // Handle text message
  const handleTextSend = useCallback(async (message: string) => {
    try {
      const response = await sendMessage(message);
      speak(response);
    } catch {
      // Error is handled by the hook
    }
  }, [sendMessage, speak]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Prevent default scrolling behavior if not in an input
        const activeElement = document.activeElement;
        const isInputActive = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.getAttribute('contenteditable') === 'true';

        if (!isInputActive) {
          e.preventDefault();
          if (isListening) {
            handleStopListening();
          } else {
            startListening();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, handleStopListening, startListening]);

  // Handle clear history
  const handleClearHistory = () => {
    stopSpeaking();
    clearHistory();
    toast({
      title: 'History Cleared',
      description: 'Your conversation history has been deleted.',
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-semibold text-primary">AI</span>
          </div>
          <div>
            <h1 className="font-semibold">Customer Support</h1>
            <p className="text-xs text-muted-foreground">Customer: {customerId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearHistory}
            title="Clear history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="min-h-full">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <span className="text-2xl">👋</span>
              </div>
              <h2 className="mb-2 text-lg font-semibold">Welcome to Customer Support</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                I can help you with product searches, order tracking, returns, cancellations, and policy questions.
                {isMicAvailable ? ' Tap the microphone or type your question below.' : ' Type your question below.'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <span className="text-xs">AI</span>
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-secondary px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Voice & Input Area */}
      <div className="border-t">
        {/* Voice Error Message - Temporary, dismissible notification */}
        {voiceError && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}

        <TranscriptPanel transcript={transcript} isListening={isListening} />

        {/* Voice Button - Always show if browser supports speech recognition */}
        {isMicAvailable && (
          <div className="flex justify-center py-4">
            <VoiceButton
              voiceState={isLoading ? 'processing' : voiceState}
              isListening={isListening}
              isMicAvailable={isMicAvailable}
              onStartListening={startListening}
              onStopListening={handleStopListening}
            />
          </div>
        )}

        {/* Info banner when mic is truly unavailable (browser doesn't support or permission denied) */}
        {!isMicAvailable && (
          <div className="mx-4 mt-3 mb-2 flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Voice input unavailable. Please use text input below.</span>
          </div>
        )}

        {/* Chat Input */}
        <ChatInput
          onSend={handleTextSend}
          isLoading={isLoading}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}
