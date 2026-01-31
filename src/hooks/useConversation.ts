import { useState, useCallback, useEffect } from 'react';
import type { Message, SessionContext, ConversationHistory } from '@/types/support';

const STORAGE_KEY_PREFIX = 'customer_support_history_';

interface UseConversationReturn {
  messages: Message[];
  context: SessionContext | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<string>;
  clearHistory: () => void;
  initSession: (customerId: string) => void;
}

export function useConversation(): UseConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<SessionContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversation from localStorage when customer ID changes
  useEffect(() => {
    if (!context?.customerId) return;

    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + context.customerId);
    if (stored) {
      try {
        const history: ConversationHistory = JSON.parse(stored);
        setMessages(history.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (e) {
        console.error('Failed to load conversation history:', e);
      }
    }
  }, [context?.customerId]);

  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    if (!context?.customerId || messages.length === 0) return;

    const history: ConversationHistory = {
      customerId: context.customerId,
      messages,
      lastUpdated: new Date()
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + context.customerId, JSON.stringify(history));
  }, [messages, context?.customerId]);

  const initSession = useCallback((customerId: string) => {
    setContext({
      customerId,
      lastOrderId: undefined,
      lastProductId: undefined,
      lastIntent: undefined
    });
    setError(null);
  }, []);

  const sendMessage = useCallback(async (content: string): Promise<string> => {
    if (!context?.customerId) {
      throw new Error('No customer session');
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          context
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      
      // Update context if returned
      if (data.context) {
        setContext(data.context);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      return data.content;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [messages, context]);

  const clearHistory = useCallback(() => {
    if (context?.customerId) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + context.customerId);
    }
    setMessages([]);
  }, [context?.customerId]);

  return {
    messages,
    context,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    initSession
  };
}
