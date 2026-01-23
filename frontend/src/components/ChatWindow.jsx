import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatWindow({ messages, isLoading, error, onSend, onClose }) {
  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header__info">
          <div className="chat-header__avatar">S</div>
          <div className="chat-header__text">
            <h3>South Oak Apartments</h3>
            <span className="chat-header__status">
              <span className="status-dot" />
              Online
            </span>
          </div>
        </div>
        <button className="chat-header__close" onClick={onClose} aria-label="Close chat">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <MessageList messages={messages} isLoading={isLoading} />

      {error && <div className="chat-error">{error}</div>}

      <MessageInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
