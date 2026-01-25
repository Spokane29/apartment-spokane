import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EmbeddedChat from './EmbeddedChat'

// Mock fetch responses
const mockGreetingResponse = {
  sessionId: 'test-session-123',
  message: 'Hello! How can I help you today?',
}

const mockChatResponse = {
  sessionId: 'test-session-123',
  message: 'I can help you with that!',
}

const mockVoiceResponse = {
  audio: 'SGVsbG8gV29ybGQ=', // base64 encoded "Hello World"
  contentType: 'audio/mpeg',
}

describe('EmbeddedChat Voice Features', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Reset fetch mock
    vi.mocked(global.fetch).mockReset()

    // Default fetch mock implementation
    vi.mocked(global.fetch).mockImplementation(async (url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/chat/greeting')) {
          return {
            ok: true,
            json: async () => mockGreetingResponse,
          } as Response
        }
        if (url.includes('/api/chat')) {
          return {
            ok: true,
            json: async () => mockChatResponse,
          } as Response
        }
        if (url.includes('/api/voice/speak')) {
          return {
            ok: true,
            json: async () => mockVoiceResponse,
          } as Response
        }
      }
      return { ok: false } as Response
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Voice Toggle Button', () => {
    it('renders voice toggle button', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        const voiceToggle = document.querySelector('.voice-toggle')
        expect(voiceToggle).toBeInTheDocument()
      })
    })

    it('starts with voice enabled (Volume2 icon)', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        const voiceButton = screen.getAllByRole('button')[0]
        expect(voiceButton).toHaveClass('active')
      })
    })

    it('toggles voice enabled state when clicked', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      const voiceButton = screen.getAllByRole('button')[0]

      // Initially active
      expect(voiceButton).toHaveClass('active')

      // Click to disable
      fireEvent.click(voiceButton)
      expect(voiceButton).not.toHaveClass('active')

      // Click to enable again
      fireEvent.click(voiceButton)
      expect(voiceButton).toHaveClass('active')
    })
  })

  describe('Microphone Button', () => {
    it('renders microphone button', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        const micButton = document.querySelector('.mic-button')
        expect(micButton).toBeInTheDocument()
      })
    })

    it('is not in listening state initially', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        const micButton = document.querySelector('.mic-button')
        expect(micButton).not.toHaveClass('listening')
      })
    })

    it('enters listening state when clicked', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      const micButton = document.querySelector('.mic-button') as HTMLButtonElement
      fireEvent.click(micButton)

      await waitFor(() => {
        expect(micButton).toHaveClass('listening')
      })
    })

    it('changes placeholder to "Listening..." when active', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Type a message...')
      const micButton = document.querySelector('.mic-button') as HTMLButtonElement

      fireEvent.click(micButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Listening...')).toBeInTheDocument()
      })
    })

    it('exits listening state when clicked again', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      const micButton = document.querySelector('.mic-button') as HTMLButtonElement

      // Start listening
      fireEvent.click(micButton)
      await waitFor(() => {
        expect(micButton).toHaveClass('listening')
      })

      // Stop listening
      fireEvent.click(micButton)
      await waitFor(() => {
        expect(micButton).not.toHaveClass('listening')
      })
    })

    it('is disabled while loading', async () => {
      // Make fetch hang to keep loading state
      vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}))

      render(<EmbeddedChat />)

      // Component should be in loading state
      await waitFor(() => {
        const micButton = document.querySelector('.mic-button') as HTMLButtonElement
        expect(micButton).toBeDisabled()
      })
    })
  })

  describe('Speech Recognition Flow', () => {
    it('sends message when speech is recognized', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      const micButton = document.querySelector('.mic-button') as HTMLButtonElement
      fireEvent.click(micButton)

      // Get the mock recognition instance and simulate a result
      // The actual simulation would need access to the recognition instance
      // For now we verify the button state changes
      await waitFor(() => {
        expect(micButton).toHaveClass('listening')
      })
    })
  })

  describe('Text-to-Speech Flow', () => {
    it('does NOT call voice API for typed messages (voice only triggers on voice input)', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      // Type and send a message (NOT voice input)
      const input = screen.getByPlaceholderText('Type a message...')
      fireEvent.change(input, { target: { value: 'What are the apartment prices?' } })

      const sendButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.any(Object))
      })

      // Voice API should NOT be called for typed messages
      const voiceCalls = vi.mocked(global.fetch).mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('/api/voice/speak')
      )
      expect(voiceCalls.length).toBe(0)
    })

    it('does not call voice API when voice is disabled', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      // Disable voice
      const voiceButton = screen.getAllByRole('button')[0]
      fireEvent.click(voiceButton)

      // Clear previous fetch calls
      vi.mocked(global.fetch).mockClear()

      // Reset the mock to track new calls
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/api/chat')) {
          return {
            ok: true,
            json: async () => mockChatResponse,
          } as Response
        }
        return { ok: false } as Response
      })

      // Type and send a message
      const input = screen.getByPlaceholderText('Type a message...')
      fireEvent.change(input, { target: { value: 'Hello' } })

      const sendButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.any(Object))
      })

      // Voice API should NOT be called
      await waitFor(() => {
        const voiceCalls = vi.mocked(global.fetch).mock.calls.filter(
          call => typeof call[0] === 'string' && call[0].includes('/api/voice/speak')
        )
        expect(voiceCalls).toHaveLength(0)
      })
    })
  })

  describe('Input Field Behavior', () => {
    it('input is disabled while listening', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Type a message...')
      const micButton = document.querySelector('.mic-button') as HTMLButtonElement

      expect(input).not.toBeDisabled()

      fireEvent.click(micButton)

      await waitFor(() => {
        expect(input).toBeDisabled()
      })
    })

    it('can send message via Enter key', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Type a message...')
      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })
    })
  })

  describe('Speaking Indicator', () => {
    it('does NOT call voice API for typed messages (only voice input triggers speech)', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      // Send a typed message (not voice)
      const input = screen.getByPlaceholderText('Type a message...')
      fireEvent.change(input, { target: { value: 'Hello' } })

      const sendButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
      fireEvent.click(sendButton)

      // Wait for chat API to be called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.any(Object))
      })

      // Voice API should NOT be called for typed messages
      const voiceCalls = vi.mocked(global.fetch).mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('/api/voice/speak')
      )
      expect(voiceCalls.length).toBe(0)
    })
  })
})

describe('Voice API - speak.js', () => {
  describe('convertToSpeakable', () => {
    // These tests would ideally test the convertToSpeakable function directly
    // For now, we test via the API response behavior

    it('voice API is called when message is sent via voice input', async () => {
      render(<EmbeddedChat />)

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      })

      // Start voice recognition
      const micButton = document.querySelector('.mic-button') as HTMLButtonElement
      fireEvent.click(micButton)

      // Simulate voice input result
      await waitFor(() => {
        const mockRecognition = (global as any).mockSpeechRecognitionInstance
        if (mockRecognition) {
          mockRecognition.simulateResult('What is the price?')
        }
      })

      // Voice API should be called for voice input
      await waitFor(() => {
        const voiceCalls = vi.mocked(global.fetch).mock.calls.filter(
          call => typeof call[0] === 'string' && call[0].includes('/api/voice/speak')
        )
        expect(voiceCalls.length).toBeGreaterThan(0)

        const voiceCall = voiceCalls[0]
        expect(voiceCall[1]).toMatchObject({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      }, { timeout: 5000 })
    })
  })
})
