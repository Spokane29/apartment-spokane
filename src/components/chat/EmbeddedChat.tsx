import { useState, useEffect, useRef } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import './embedded-chat.css'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

// Check if browser supports speech recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export default function EmbeddedChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    initChat()
    // Initialize speech recognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
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
      setMessages([{ id: Date.now(), role: 'assistant', content: "Hi! I'm the virtual assistant for South Oak Apartments. Can I schedule a tour or answer any questions?" }])
    } finally {
      setIsLoading(false)
    }
  }

  const speakText = async (text: string) => {
    if (!voiceEnabled) return

    try {
      setIsSpeaking(true)
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        console.error('Voice API error')
        setIsSpeaking(false)
        return
      }

      const data = await res.json()
      if (data.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
        audioRef.current = audio
        audio.onended = () => setIsSpeaking(false)
        audio.onerror = () => setIsSpeaking(false)
        await audio.play()
      }
    } catch (err) {
      console.error('Failed to speak:', err)
      setIsSpeaking(false)
    }
  }

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    const userMessage: Message = { id: Date.now(), role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      })
      const data = await res.json()
      setSessionId(data.sessionId)
      const assistantMessage = data.message
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: assistantMessage }])

      // Speak the response if voice is enabled
      if (voiceEnabled && assistantMessage) {
        speakText(assistantMessage)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again or call us at (888) 613-0442." }])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleListening = () => {
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      stopSpeaking() // Stop any playing audio
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="embedded-chat">
      <div className="embedded-chat-header-controls">
        <button
          type="button"
          className={`voice-toggle ${voiceEnabled ? 'active' : ''}`}
          onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) stopSpeaking(); }}
          title={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
        >
          {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      <div className="embedded-chat-messages" ref={messagesContainerRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`embedded-msg embedded-msg--${msg.role}`}>
            {msg.role === 'assistant' && <div className="embedded-msg-avatar">S</div>}
            <div className="embedded-msg-content">
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="embedded-msg embedded-msg--assistant">
            <div className="embedded-msg-avatar">S</div>
            <div className="embedded-msg-content">
              <div className="embedded-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        {isSpeaking && (
          <div className="speaking-indicator">
            <Volume2 size={14} className="pulse" /> Speaking...
          </div>
        )}
      </div>

      <form className="embedded-chat-input" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
        <button
          type="button"
          className={`mic-button ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          disabled={isLoading}
          title={isListening ? 'Stop listening' : 'Speak your message'}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : 'Type a message...'}
          disabled={isLoading || isListening}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
