import { useState, useEffect, useRef } from 'react'
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
  const [isRecording, setIsRecording] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasSpokenRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const audioUnlockedRef = useRef(false)
  const pendingAudioRef = useRef<string | null>(null)

  // Keep sessionIdRef in sync with state
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    initChat()
    return () => {
      stopRecording()
      stopSpeaking()
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

  // Unlock audio on iOS - must be called during user gesture
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return

    // Create a persistent audio element and play silent audio to unlock
    const audio = new Audio()
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v/////////////////////////////////'
    audio.volume = 0.01
    audio.play().then(() => {
      audio.pause()
      audioUnlockedRef.current = true
      audioRef.current = audio
      console.log('Audio unlocked for iOS')

      // Play any pending audio
      if (pendingAudioRef.current) {
        playAudio(pendingAudioRef.current)
        pendingAudioRef.current = null
      }
    }).catch(err => {
      console.log('Audio unlock failed:', err)
    })
  }

  // Play audio from base64 data
  const playAudio = async (base64Audio: string) => {
    try {
      const audio = audioRef.current || new Audio()
      audio.src = `data:audio/mpeg;base64,${base64Audio}`
      audio.volume = 1
      audio.onended = () => setIsSpeaking(false)
      audio.onerror = () => setIsSpeaking(false)
      audioRef.current = audio
      await audio.play()
    } catch (err) {
      console.error('Audio play failed:', err)
      setIsSpeaking(false)
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
        if (audioUnlockedRef.current) {
          await playAudio(data.audio)
        } else {
          // Store for later when audio is unlocked
          pendingAudioRef.current = data.audio
          console.log('Audio not unlocked, storing for later')
        }
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

  // Send message to chat API (same for text and voice input)
  const sendMessage = async (messageText?: string, fromVoice = false) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    const userMessage: Message = { id: Date.now(), role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Use ref to avoid stale closure in voice callbacks
    const currentSessionId = sessionIdRef.current
    console.log('sendMessage called:', { text, fromVoice, currentSessionId })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: currentSessionId }),
      })
      const data = await res.json()
      console.log('Chat API response:', { sessionId: data.sessionId, message: data.message?.substring(0, 50) })
      setSessionId(data.sessionId)
      sessionIdRef.current = data.sessionId
      const assistantMessage = data.message
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: assistantMessage }])

      // Speak the response if voice input was used
      if (fromVoice && voiceEnabled && assistantMessage) {
        speakText(assistantMessage)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again or call us at (888) 613-0442." }])
    } finally {
      setIsLoading(false)
    }
  }

  // Start recording audio with silence detection
  const startRecording = async () => {
    try {
      // Unlock audio for iOS during user gesture
      unlockAudio()

      // Stop any playing audio first
      stopSpeaking()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []
      hasSpokenRef.current = false

      // Set up audio analysis for silence detection
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 512
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Clean up
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
          silenceTimeoutRef.current = null
        }
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null

        if (audioChunksRef.current.length === 0) {
          console.log('No audio recorded')
          return
        }

        // Create blob and transcribe
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
      }

      // Monitor audio levels for silence detection
      const checkSilence = () => {
        if (!analyserRef.current || !mediaRecorderRef.current) return

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length

        // Threshold for speech vs silence
        const isSpeaking = average > 10

        if (isSpeaking) {
          hasSpokenRef.current = true
          // Clear any pending silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
            silenceTimeoutRef.current = null
          }
        } else if (hasSpokenRef.current && !silenceTimeoutRef.current) {
          // Start silence timeout - stop after 1.5s of silence
          silenceTimeoutRef.current = setTimeout(() => {
            console.log('Silence detected, stopping recording')
            stopRecording()
          }, 1500)
        }

        // Continue monitoring if still recording
        if (mediaRecorderRef.current?.state === 'recording') {
          requestAnimationFrame(checkSilence)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      console.log('Recording started with silence detection')

      // Start monitoring after a brief delay
      setTimeout(checkSilence, 200)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Could not access microphone. Please check your browser permissions.')
    }
  }

  // Stop recording audio
  const stopRecording = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    console.log('Recording stopped')
  }

  // Transcribe audio using Deepgram
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)

    try {
      // Convert blob to base64
      const reader = new FileReader()
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string
          // Remove data URL prefix
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      })

      if (!res.ok) {
        const error = await res.json()
        console.error('Transcription error:', error)
        setIsTranscribing(false)
        return
      }

      const data = await res.json()
      const transcript = data.transcript?.trim()
      console.log('Deepgram response:', { transcript, sessionIdRef: sessionIdRef.current })

      if (transcript) {
        console.log('Transcribed, calling sendMessage with sessionId:', sessionIdRef.current)
        // Send the transcribed text as a message (same as typing)
        await sendMessage(transcript, true)
        console.log('sendMessage completed for voice input')
      } else {
        console.log('No speech detected')
      }
    } catch (err) {
      console.error('Transcription failed:', err)
    } finally {
      setIsTranscribing(false)
    }
  }

  // Toggle recording on/off
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isBusy = isLoading || isTranscribing

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
        {isTranscribing && (
          <div className="transcribing-indicator">
            <Mic size={14} className="pulse" /> Transcribing...
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
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          disabled={isBusy || isSpeaking}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isBusy}
        />
        <button type="submit" disabled={isBusy || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
