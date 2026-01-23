import React, { useEffect, useRef } from 'react';
import TypingIndicator from './TypingIndicator';

export default function MessageList({ messages, isLoading }) {
  const listRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="message-list" ref={listRef}>
      {messages.map((message) => (
        <div key={message.id} className={`message message--${message.role}`}>
          {message.role === 'assistant' && <div className="message__avatar">S</div>}
          <div className="message__content">
            <p>{message.content}</p>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="message message--assistant">
          <div className="message__avatar">S</div>
          <div className="message__content">
            <TypingIndicator />
          </div>
        </div>
      )}
    </div>
  );
}
