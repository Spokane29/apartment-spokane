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

  // Convert base64 to Blob URL (works better on mobile)
  const base64ToBlob = (base64: string, mimeType: string): string => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })
    return URL.createObjectURL(blob)
  }

  // Play audio from base64 data - returns true if successful
  const playAudio = async (base64Audio: string): Promise<boolean> => {
    console.log('playAudio called, audio length:', base64Audio.length)
    try {
      // Convert base64 to blob URL (better mobile support)
      const blobUrl = base64ToBlob(base64Audio, 'audio/mpeg')
      console.log('Created blob URL:', blobUrl)

      // Create fresh audio element
      const audio = new Audio()
      audio.setAttribute('playsinline', 'true')
      audio.setAttribute('webkit-playsinline', 'true')
      audio.preload = 'auto'
      audio.src = blobUrl

      audio.onended = () => {
        console.log('Audio playback ended')
        URL.revokeObjectURL(blobUrl)
        setIsSpeaking(false)
      }
      audio.onerror = (e) => {
        console.error('Audio error:', e)
        URL.revokeObjectURL(blobUrl)
      }
      audio.onloadeddata = () => {
        console.log('Audio loaded, duration:', audio.duration)
      }

      audioRef.current = audio

      // Wait for load then play
      audio.load()
      await new Promise(resolve => setTimeout(resolve, 100))

      await audio.play()
      console.log('Audio playing successfully')
      return true
    } catch (err) {
      console.error('Audio play failed:', err)
      return false
    }
  }

  // Pre-warm audio context during user gesture (for iOS/mobile)
  const warmUpAudio = () => {
    try {
      // Create and resume AudioContext to unlock audio on iOS
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const ctx = new AudioContext()
        ctx.resume().then(() => {
          console.log('AudioContext resumed')
          // Create a short silent buffer and play it
          const buffer = ctx.createBuffer(1, 1, 22050)
          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.connect(ctx.destination)
          source.start(0)
          console.log('Audio warmed up via AudioContext')
        })
      }
    } catch (e) {
      console.log('Warm up error:', e)
    }
  }

  // Fallback: use browser's built-in speech synthesis
  const speakWithBrowserTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      console.log('Using browser TTS fallback')
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    } else {
      setIsSpeaking(false)
    }
  }

  const speakText = async (text: string) => {
    if (!voiceEnabled) return

    // Detect mobile - don't auto-play, just use browser TTS which is more reliable
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    console.log('speakText called, isMobile:', isMobile)

    setIsSpeaking(true)

    if (isMobile) {
      // On mobile, use browser's built-in TTS (more reliable)
      speakWithBrowserTTS(text)
      return
    }

    // On desktop, try ElevenLabs
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        console.error('Voice API error, using browser TTS')
        speakWithBrowserTTS(text)
        return
      }

      const data = await res.json()

      if (data.audio) {
        const played = await playAudio(data.audio)
        if (!played) {
          speakWithBrowserTTS(text)
        }
      } else {
        speakWithBrowserTTS(text)
      }
    } catch (err) {
      console.error('Failed to speak:', err)
      speakWithBrowserTTS(text)
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
      // Warm up audio element during user gesture (required for iOS/mobile)
      warmUpAudio()

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
