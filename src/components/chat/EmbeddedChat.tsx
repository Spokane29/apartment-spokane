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
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldRestartListening = useRef(false)

  useEffect(() => {
    initChat()
    // Initialize speech recognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        // Get the latest result
        const lastResult = event.results[event.results.length - 1]
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript
          // Stop listening and send
          if (transcript.trim()) {
            stopListeningAndSend(transcript.trim())
          }
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error !== 'no-speech') {
          setIsListening(false)
          clearListeningTimeout()
        }
      }

      recognitionRef.current.onend = () => {
        // Restart if we should keep listening (voice mode active)
        if (shouldRestartListening.current && !isLoading) {
          try {
            recognitionRef.current?.start()
          } catch (e) {
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      clearListeningTimeout()
    }
  }, [])

  const clearListeningTimeout = () => {
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current)
      listeningTimeoutRef.current = null
    }
  }

  const stopListeningAndSend = (text: string) => {
    clearListeningTimeout()
    shouldRestartListening.current = false
    recognitionRef.current?.stop()
    setIsListening(false)
    sendMessage(text)
  }

  const startListeningWithTimeout = () => {
    clearListeningTimeout()
    shouldRestartListening.current = true
    // Auto-stop after 15 seconds of no final result
    listeningTimeoutRef.current = setTimeout(() => {
      shouldRestartListening.current = false
      recognitionRef.current?.stop()
      setIsListening(false)
    }, 15000)
  }

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
    if (!voiceEnabled) {
      console.log('Voice disabled, skipping speech')
      return
    }

    try {
      console.log('Speaking text:', text.substring(0, 50) + '...')
      setIsSpeaking(true)
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Voice API error:', res.status, errorText)
        setIsSpeaking(false)
        return
      }

      const data = await res.json()
      console.log('Voice API response received, audio length:', data.audio?.length || 0)
      if (data.audio) {
        console.log('Creating audio element...')
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
        audioRef.current = audio
        audio.onended = () => {
          console.log('Audio finished playing')
          setIsSpeaking(false)
          // Auto-start listening after AI finishes speaking
          if (voiceEnabled && SpeechRecognition) {
            startListeningWithTimeout()
            try {
              recognitionRef.current?.start()
              setIsListening(true)
            } catch (e) {
              console.error('Failed to restart listening:', e)
            }
          }
        }
        audio.onerror = (e) => {
          console.error('Audio playback error:', e)
          setIsSpeaking(false)
        }
        console.log('Playing audio...')
        await audio.play()
        console.log('Audio play started')
      } else {
        console.error('No audio data in response')
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
      shouldRestartListening.current = false
      clearListeningTimeout()
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      stopSpeaking() // Stop any playing audio
      startListeningWithTimeout()
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
