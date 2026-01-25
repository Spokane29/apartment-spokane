import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import './embedded-chat.css'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

// Web Speech API types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export default function EmbeddedChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [interimText, setInterimText] = useState('')

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const voiceEnabledRef = useRef(true)
  const persistentAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioUnlockedRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listenTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    initChat()
    return () => {
      stopListening()
    }
  }, [])

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
      setMessages([{ id: Date.now(), role: 'assistant', content: "Hi, I'm the virtual assistant for South Oak Apartments. How can I help you?" }])
    } finally {
      setIsLoading(false)
    }
  }

  // Unlock audio playback on iOS
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return

    if (!persistentAudioRef.current) {
      const audio = document.createElement('audio')
      audio.setAttribute('playsinline', 'true')
      audio.setAttribute('webkit-playsinline', 'true')
      persistentAudioRef.current = audio
    }

    const silentAudio = persistentAudioRef.current
    silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+xBkAA/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZDAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=='
    silentAudio.volume = 0.01
    silentAudio.load()
    silentAudio.play().then(() => {
      audioUnlockedRef.current = true
      console.log('iOS audio unlocked')
    }).catch(() => {})
  }

  const handleVoiceInput = useCallback((text: string) => {
    console.log('Voice result:', text)
    if (!text.trim()) return

    setInterimText('')
    stopListening()
    sendMessage(text.trim())
  }, [])

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
        let audio = persistentAudioRef.current
        if (!audio) {
          audio = document.createElement('audio')
          audio.setAttribute('playsinline', 'true')
          audio.setAttribute('webkit-playsinline', 'true')
          persistentAudioRef.current = audio
        }
        audioRef.current = audio

        audio.onended = null
        audio.onerror = null

        audio.src = `data:audio/mpeg;base64,${data.audio}`
        audio.volume = 1.0

        audio.onended = () => {
          console.log('Audio ended, starting auto-listen')
          setIsSpeaking(false)
          setTimeout(() => {
            if (voiceEnabledRef.current) {
              startListening(true)
            }
          }, 300)
        }

        audio.onerror = () => {
          console.error('Audio playback error')
          setIsSpeaking(false)
          setTimeout(() => {
            if (voiceEnabledRef.current) {
              startListening(true)
            }
          }, 300)
        }

        audio.load()
        audio.play().catch(err => {
          console.error('Audio play failed:', err)
          setIsSpeaking(false)
          setTimeout(() => {
            if (voiceEnabledRef.current) {
              startListening(true)
            }
          }, 300)
        })
      } else {
        setIsSpeaking(false)
        if (voiceEnabledRef.current) {
          setTimeout(() => startListening(true), 300)
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

  // Start Web Speech API listening
  const startListening = (isAutoStart = false) => {
    unlockAudio()
    stopSpeaking()

    // Check if Web Speech API is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please use Chrome, Safari, or Edge.')
      return
    }

    // Stop existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {}
      recognitionRef.current = null
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        console.log('Speech recognition started')
        setIsListening(true)
        setInterimText('')
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        if (interimTranscript) {
          setInterimText(interimTranscript)
        }

        if (finalTranscript) {
          console.log('Final transcript:', finalTranscript)
          handleVoiceInput(finalTranscript)
        }
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          // Don't show alert for common non-errors
        }
        setIsListening(false)
        setInterimText('')
      }

      recognition.onend = () => {
        console.log('Speech recognition ended')
        setIsListening(false)
        setInterimText('')
      }

      recognition.start()

      // Auto-stop after timeout
      const timeout = isAutoStart ? 10000 : 30000
      listenTimeoutRef.current = setTimeout(() => {
        console.log('Listen timeout')
        stopListening()
      }, timeout)

    } catch (err) {
      console.error('Failed to start speech recognition:', err)
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
        recognitionRef.current.abort()
      } catch (e) {}
      recognitionRef.current = null
    }

    setIsListening(false)
    setInterimText('')
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
            unlockAudio()
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
        {interimText && (
          <div className="interim-text">
            <Mic size={14} /> {interimText}...
          </div>
        )}
      </div>

      <form className="embedded-chat-input" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
        <button
          type="button"
          className={`mic-button ${isListening ? 'listening' : ''}`}
          onClick={() => isListening ? stopListening() : startListening()}
          disabled={isLoading || isSpeaking}
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
