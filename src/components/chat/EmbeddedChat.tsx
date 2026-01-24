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
  const audioContextRef = useRef<AudioContext | null>(null)
  const listenTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    initChat()

    // Initialize speech recognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        if (transcript.trim()) {
          handleVoiceInput(transcript.trim())
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
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
      setMessages([{ id: Date.now(), role: 'assistant', content: "Hi! I'm the virtual assistant for South Oak Apartments. How can I help you?" }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceInput = (text: string) => {
    // Clear the auto-stop timeout since we got input
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current)
      listenTimeoutRef.current = null
    }
    setIsListening(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore - already stopped
      }
    }
    sendMessage(text)
  }

  // Initialize AudioContext on user gesture (required for mobile)
  const initAudioContext = () => {
    if (audioContextRef.current) return audioContextRef.current

    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass()
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }
      console.log('AudioContext initialized')
    }
    return audioContextRef.current
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
        // Try Web Audio API first (more reliable on mobile)
        const ctx = audioContextRef.current
        if (ctx) {
          try {
            // Resume context if suspended
            if (ctx.state === 'suspended') {
              await ctx.resume()
            }

            // Decode base64 to array buffer
            const binaryString = atob(data.audio)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }

            const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0))
            const source = ctx.createBufferSource()
            source.buffer = audioBuffer
            source.connect(ctx.destination)

            source.onended = () => {
              console.log('Audio ended, starting auto-listen')
              setIsSpeaking(false)
              autoStartListening()
            }

            source.start()
            console.log('Playing via Web Audio API')
            return
          } catch (e) {
            console.log('Web Audio failed, trying HTML5:', e)
          }
        }

        // Fallback to HTML5 Audio
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
        audioRef.current = audio

        audio.onended = () => {
          console.log('Audio ended, starting auto-listen')
          setIsSpeaking(false)
          autoStartListening()
        }

        audio.onerror = () => {
          console.error('Audio playback error')
          setIsSpeaking(false)
        }

        audio.play().catch(err => {
          console.error('Audio play failed:', err)
          setIsSpeaking(false)
        })
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

    // Initialize AudioContext on user interaction (needed for mobile)
    initAudioContext()

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

  const startListening = async () => {
    // Initialize AudioContext on user interaction (needed for mobile)
    initAudioContext()

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome.')
      return
    }

    if (!recognitionRef.current) {
      alert('Speech recognition failed to initialize')
      return
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access to use voice input.')
      return
    }

    stopSpeaking()
    setIsListening(true)

    try {
      recognitionRef.current.start()
    } catch (err: any) {
      console.error('Failed to start listening:', err)
      alert('Failed to start speech recognition: ' + err.message)
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current)
      listenTimeoutRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore
      }
    }
    setIsListening(false)
  }

  // Auto-start listening after AI speaks (with 5 second timeout)
  const autoStartListening = () => {
    console.log('autoStartListening called, voiceEnabled:', voiceEnabled)

    if (!SpeechRecognition) {
      console.log('No SpeechRecognition support')
      return
    }
    if (!recognitionRef.current) {
      console.log('No recognition ref')
      return
    }
    if (!voiceEnabled) {
      console.log('Voice disabled, skipping auto-listen')
      return
    }

    // Clear any existing timeout
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current)
      listenTimeoutRef.current = null
    }

    // Small delay to let the previous recognition fully stop
    setTimeout(() => {
      setIsListening(true)

      try {
        recognitionRef.current.start()
        console.log('Auto-listening started')

        // Auto-stop after 5 seconds if no speech detected
        listenTimeoutRef.current = setTimeout(() => {
          console.log('Auto-listen timeout - stopping')
          setIsListening(false)
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop()
            } catch (e) {
              // Ignore
            }
          }
        }, 5000)
      } catch (err: any) {
        console.error('Failed to auto-start listening:', err.message)
        setIsListening(false)
      }
    }, 300)
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
          onClick={() => isListening ? stopListening() : startListening()}
          disabled={isLoading}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
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
