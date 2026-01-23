import { useState, useCallback, useRef } from 'react';

const API_BASE = '/api';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(null);

  // Initialize chat with greeting
  const initChat = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/chat/greeting`);
      const data = await response.json();

      sessionIdRef.current = data.sessionId;
      setMessages([
        {
          id: Date.now(),
          role: 'assistant',
          content: data.message,
        },
      ]);
    } catch (err) {
      setError('Failed to connect. Please try again.');
      console.error('Init error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          sessionId: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      sessionIdRef.current = data.sessionId;

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Send error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear chat and start fresh
  const clearChat = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    initChat,
    sendMessage,
    clearChat,
  };
}
