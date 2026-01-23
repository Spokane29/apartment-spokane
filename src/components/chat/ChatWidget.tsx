import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import './chat.css'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initChat()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const initChat = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/chat/greeting')
      const data = await res.json()
      setSessionId(data.sessionId)
      setMessages([{ id: Date.now(), role: 'assistant', content: data.message }])
    } catch (err) {
      console.error('Failed to init chat:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { id: Date.now(), role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, sessionId }),
      })
      const data = await res.json()
      setSessionId(data.sessionId)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.message }])
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-widget">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">S</div>
              <div>
                <h3>South Oak Apartments</h3>
                <span className="chat-status"><span className="status-dot" />Online</span>
              </div>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                {msg.role === 'assistant' && <div className="chat-msg-avatar">S</div>}
                <div className="chat-msg-content">
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message chat-message--assistant">
                <div className="chat-msg-avatar">S</div>
                <div className="chat-msg-content">
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        className={`chat-bubble ${isOpen ? 'chat-bubble--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  )
}
