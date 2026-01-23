import React, { useState, useEffect } from 'react';
import ChatBubble from './ChatBubble';
import ChatWindow from './ChatWindow';
import { useChat } from '../hooks/useChat';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, error, initChat, sendMessage } = useChat();

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initChat();
    }
  }, [isOpen, messages.length, initChat]);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="south-oak-chat">
      {isOpen && (
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSend={sendMessage}
          onClose={toggleChat}
        />
      )}
      <ChatBubble isOpen={isOpen} onClick={toggleChat} />
    </div>
  );
}
