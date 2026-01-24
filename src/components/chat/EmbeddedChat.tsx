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
  const voiceEnabledRef = useRef(true) // Ref to avoid stale closure in callbacks
  const micStreamRef = useRef<MediaStream | null>(null) // Track mic stream to release it

  // Create/recreate speech recognition instance
  const createRecognition = () => {
    if (!SpeechRecognition) return null

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      console.log('Speech result:', transcript)
      if (transcript.trim()) {
        handleVoiceInput(transcript.trim())
      }
    }

    recognition.onerror = (event: any) => {
      // Ignore 'aborted' and 'no-speech' errors - they're expected
      if (event.error === 'aborted' || event.error === 'no-speech') {
        console.log('Recognition ended:', event.error)
      } else {
        console.error('Speech recognition error:', event.error)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('Recognition onend fired')
      setIsListening(false)
    }

    return recognition
  }

  useEffect(() => {
    initChat()

    // Initialize speech recognition
    recognitionRef.current = createRecognition()

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [])

  // Keep voiceEnabledRef in sync with state (for callbacks)
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled
  }, [voiceEnabled])

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

  // Preprocess voice input to fix common speech recognition mistakes
  const preprocessVoiceText = (text: string): string => {
    let result = text

    // Fix spoken emails: "penny at gmail dot com" → "penny@gmail.com"
    result = result.replace(/\s+at\s+/gi, '@')
    result = result.replace(/\s+dot\s+/gi, '.')

    // Common misheards for "at"
    result = result.replace(/\s+add\s+/gi, '@')  // "add" sounds like "at"
    result = result.replace(/\s+hat\s+/gi, '@')  // "hat" misheard

    // Fix gmail/yahoo/hotmail variations
    result = result.replace(/@\s*g\s*mail/gi, '@gmail')
    result = result.replace(/@\s*gmail/gi, '@gmail')
    result = result.replace(/@\s*yahoo/gi, '@yahoo')
    result = result.replace(/@\s*hotmail/gi, '@hotmail')
    result = result.replace(/@\s*outlook/gi, '@outlook')
    result = result.replace(/@\s*icloud/gi, '@icloud')

    // Fix .com variations
    result = result.replace(/dot\s*com$/gi, '.com')
    result = result.replace(/\.\s*com$/gi, '.com')
    result = result.replace(/\s+calm$/gi, '.com')  // "calm" sounds like "com"
    result = result.replace(/\s+come$/gi, '.com')  // "come" sounds like "com"

    // Remove spaces around @ and .
    result = result.replace(/\s*@\s*/g, '@')
    result = result.replace(/(\w)\s*\.\s*(com|org|net|edu|io)$/gi, '$1.$2')

    console.log('Voice preprocessed:', text, '→', result)
    return result
  }

  const handleVoiceInput = (text: string) => {
    console.log('handleVoiceInput:', text)
    // Clear the auto-stop timeout since we got input
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current)
      listenTimeoutRef.current = null
    }
    setIsListening(false)

    // Fully cleanup recognition to prepare for next auto-listen
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null
    }

    // Release mic stream to free up hardware
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
      console.log('Released mic stream after voice input')
    }

    // Preprocess voice input to fix email formatting
    const processedText = preprocessVoiceText(text)
    sendMessage(processedText)
  }

  // Track if audio has been unlocked on iOS
  const audioUnlockedRef = useRef(false)

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

  // Unlock audio playback on iOS (must be called during user gesture)
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return

    // Create and play a silent audio to unlock iOS audio
    const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+xBkAA/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZDAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==')
    silentAudio.volume = 0.01
    silentAudio.play().then(() => {
      audioUnlockedRef.current = true
      console.log('iOS audio unlocked')
    }).catch(() => {
      // Ignore errors - this is just to unlock
    })
  }

  const speakText = async (text: string) => {
    if (!voiceEnabledRef.current) return

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
        // Use HTML5 Audio with iOS Safari compatibility
        const audio = new Audio()
        audioRef.current = audio

        // iOS Safari requires these attributes
        audio.setAttribute('playsinline', 'true')
        audio.setAttribute('webkit-playsinline', 'true')

        // Set source after attributes
        audio.src = `data:audio/mpeg;base64,${data.audio}`

        audio.onended = () => {
          console.log('Audio ended, starting auto-listen')
          setIsSpeaking(false)
          setTimeout(() => {
            autoStartListening()
          }, 200)
        }

        audio.onerror = (e) => {
          console.error('Audio playback error:', e)
          setIsSpeaking(false)
          setTimeout(() => {
            autoStartListening()
          }, 200)
        }

        // iOS Safari needs load() before play()
        audio.load()

        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Audio play failed:', err)
            setIsSpeaking(false)
            setTimeout(() => {
              autoStartListening()
            }, 200)
          })
        }
      } else {
        console.log('No audio data received')
        setIsSpeaking(false)
        // Still try to auto-listen if voice enabled
        if (voiceEnabledRef.current) {
          setTimeout(() => {
            autoStartListening()
          }, 200)
        }
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

    // Initialize AudioContext and unlock audio on user interaction (needed for mobile/iOS)
    initAudioContext()
    unlockAudio()

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
    // Initialize AudioContext and unlock audio on user interaction (needed for mobile/iOS)
    initAudioContext()
    unlockAudio()

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome.')
      return
    }

    // Create fresh recognition instance if needed
    if (!recognitionRef.current) {
      console.log('Creating recognition for manual start')
      recognitionRef.current = createRecognition()
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

    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch (err: any) {
      console.error('Failed to start listening:', err)
      // Try with fresh instance
      console.log('Retrying with fresh recognition...')
      recognitionRef.current = createRecognition()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
          setIsListening(true)
        } catch (retryErr: any) {
          alert('Failed to start speech recognition: ' + retryErr.message)
          setIsListening(false)
        }
      }
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
  const autoStartListening = async (retryCount = 0) => {
    // Use ref to get current value (avoid stale closure)
    const isVoiceEnabled = voiceEnabledRef.current
    console.log('autoStartListening called, voiceEnabled:', isVoiceEnabled, 'retry:', retryCount)

    if (!SpeechRecognition) {
      console.log('No SpeechRecognition support')
      return
    }
    if (!isVoiceEnabled) {
      console.log('Voice disabled, skipping auto-listen')
      return
    }

    // Clear any existing timeout
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current)
      listenTimeoutRef.current = null
    }

    // Stop any existing recognition first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null
    }

    // Release previous mic stream completely before requesting new one
    if (micStreamRef.current) {
      console.log('Releasing previous mic stream...')
      micStreamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('Stopped track:', track.kind)
      })
      micStreamRef.current = null
    }

    // Re-request mic permission to ensure we still have access (mobile can revoke)
    try {
      console.log('Re-requesting mic permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream // Store so we can release it next time
      console.log('Mic permission confirmed, stream active')
    } catch (err) {
      console.error('Mic permission lost:', err)
      return
    }

    // Longer delay for mobile - give browser time to fully release mic
    const delay = retryCount === 0 ? 600 : 400
    console.log('Waiting', delay, 'ms before starting recognition')

    setTimeout(() => {
      // ALWAYS create fresh recognition instance for mobile reliability
      console.log('Creating fresh recognition instance')
      recognitionRef.current = createRecognition()

      if (!recognitionRef.current) {
        console.log('Failed to create recognition')
        return
      }

      try {
        recognitionRef.current.start()
        setIsListening(true)
        console.log('Auto-listening started successfully')

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

        // Retry up to 2 times with fresh recognition instance
        if (retryCount < 2) {
          console.log('Retrying with fresh recognition... attempt', retryCount + 1)
          setTimeout(() => autoStartListening(retryCount + 1), 700)
        }
      }
    }, delay)
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
            initAudioContext()
            unlockAudio() // Unlock iOS audio on user gesture
            setVoiceEnabled(!voiceEnabled)
            if (voiceEnabled) stopSpeaking()
          }}
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
