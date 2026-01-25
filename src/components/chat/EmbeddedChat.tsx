import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import './embedded-chat.css'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

// Check if browser supports speech recognition
const SpeechRecognition = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null

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
  const sessionIdRef = useRef<string | null>(null)
  const voiceEnabledRef = useRef(true)
  const pendingTranscriptRef = useRef<string | null>(null)

  // Keep refs in sync
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled
  }, [voiceEnabled])

  useEffect(() => {
    initChat()
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {}
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
      setMessages([{ id: Date.now(), role: 'assistant', content: "Hi, I'm the virtual assistant for South Oak Apartments. How can I help you?" }])
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
        console.error('Voice API error:', res.status)
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
      } else {
        setIsSpeaking(false)
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

      // Don't speak for typed messages - only for voice input
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again or call us at (888) 613-0442." }])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleListening = () => {
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      stopSpeaking() // Stop any playing audio

      // Create fresh recognition instance each time (fixes Chrome issues)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        console.log('Speech recognition started')
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        console.log('Speech result:', transcript)
        setIsListening(false)
        if (transcript.trim()) {
          // Store transcript and process it
          pendingTranscriptRef.current = transcript.trim()
          handleVoiceResult(transcript.trim())
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        console.log('Speech recognition ended')
        setIsListening(false)
      }

      recognitionRef.current = recognition

      try {
        recognition.start()
        console.log('Recognition start() called')
      } catch (err) {
        console.error('Failed to start listening:', err)
        setIsListening(false)
      }
    }
  }

  // Handle voice result - send message and speak response
  const handleVoiceResult = async (text: string) => {
    if (!text || isLoading) return

    const userMessage: Message = { id: Date.now(), role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionIdRef.current }),
      })
      const data = await res.json()
      setSessionId(data.sessionId)
      sessionIdRef.current = data.sessionId
      const assistantMessage = data.message
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: assistantMessage }])

      // Speak the response if voice is enabled
      if (voiceEnabledRef.current && assistantMessage) {
        speakText(assistantMessage)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again or call us at (888) 613-0442." }])
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
    <div className="embedded-chat">
      <div className="embedded-chat-header-controls">
        <button
          type="button"
          className={`voice-toggle ${voiceEnabled ? 'active' : ''}`}
          onClick={() => {
            setVoiceEnabled(!voiceEnabled)
            if (voiceEnabled) stopSpeaking()
          }}
          title={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
        >
          {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
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
          disabled={isLoading || isSpeaking}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
