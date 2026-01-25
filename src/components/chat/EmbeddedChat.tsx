import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import './embedded-chat.css'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
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

  // Deepgram refs
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
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
    console.log('Deepgram result:', text)
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

  // Start Deepgram listening
  const startListening = async (isAutoStart = false) => {
    unlockAudio()
    stopSpeaking()

    // Stop any existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })
      streamRef.current = stream

      // Get Deepgram API key from server
      const tokenRes = await fetch('/api/voice/deepgram-token')
      const tokenData = await tokenRes.json()

      if (!tokenData.key) {
        console.error('No Deepgram key')
        alert('Voice recognition not available')
        return
      }

      // Connect to Deepgram WebSocket
      const wsUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&punctuate=true&smart_format=true&model=nova-2`
      const ws = new WebSocket(wsUrl, ['token', tokenData.key])
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Deepgram connected')
        setIsListening(true)
        setInterimText('')

        // Create MediaRecorder to capture audio
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })
        mediaRecorderRef.current = mediaRecorder

        // Use AudioContext to get raw PCM data for Deepgram
        const audioContext = new AudioContext({ sampleRate: 16000 })
        const source = audioContext.createMediaStreamSource(stream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0)
            // Convert float32 to int16
            const int16Data = new Int16Array(inputData.length)
            for (let i = 0; i < inputData.length; i++) {
              int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
            }
            ws.send(int16Data.buffer)
          }
        }

        source.connect(processor)
        processor.connect(audioContext.destination)

        // Auto-stop after 8 seconds for auto-start, or 30 seconds for manual
        const timeout = isAutoStart ? 8000 : 30000
        listenTimeoutRef.current = setTimeout(() => {
          console.log('Listen timeout')
          stopListening()
        }, timeout)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript

            if (data.is_final && transcript.trim()) {
              console.log('Final transcript:', transcript)
              handleVoiceInput(transcript)
            } else if (transcript.trim()) {
              setInterimText(transcript)
            }
          }
        } catch (e) {
          console.error('Parse error:', e)
        }
      }

      ws.onerror = (err) => {
        console.error('Deepgram error:', err)
        stopListening()
      }

      ws.onclose = () => {
        console.log('Deepgram disconnected')
        setIsListening(false)
      }

    } catch (err: any) {
      console.error('Failed to start listening:', err)
      if (err.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access to use voice input.')
      }
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current)
      listenTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {}
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
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
