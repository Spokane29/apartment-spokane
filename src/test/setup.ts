import '@testing-library/jest-dom'

// Mock navigator.mediaDevices.getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{
        stop: vi.fn()
      }]
    })
  },
  writable: true
})

// Mock Web Speech API
class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = 'en-US'
  onresult: ((event: any) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null

  start() {
    if (this.onstart) this.onstart()
  }

  stop() {
    if (this.onend) this.onend()
  }

  abort() {
    if (this.onend) this.onend()
  }

  // Helper to simulate speech result
  simulateResult(transcript: string, isFinal = true) {
    if (this.onresult) {
      this.onresult({
        resultIndex: 0,
        results: {
          length: 1,
          item: () => ({
            isFinal,
            length: 1,
            item: () => ({ transcript, confidence: 0.9 }),
            0: { transcript, confidence: 0.9 },
          }),
          0: {
            isFinal,
            length: 1,
            item: () => ({ transcript, confidence: 0.9 }),
            0: { transcript, confidence: 0.9 },
          },
        },
      })
    }
  }

  // Helper to simulate error
  simulateError(error: string) {
    if (this.onerror) {
      this.onerror({ error })
    }
  }
}

// @ts-ignore
global.SpeechRecognition = MockSpeechRecognition
// @ts-ignore
global.webkitSpeechRecognition = MockSpeechRecognition

// Mock fetch
global.fetch = vi.fn()

// Mock Audio
class MockAudio {
  src = ''
  volume = 1
  onended: (() => void) | null = null
  onerror: (() => void) | null = null

  setAttribute() {}
  load() {}
  play() {
    return Promise.resolve()
  }
  pause() {}
}

// @ts-ignore
global.Audio = MockAudio

// Mock document.createElement for audio
const originalCreateElement = document.createElement.bind(document)
document.createElement = (tagName: string) => {
  if (tagName === 'audio') {
    return new MockAudio() as any
  }
  return originalCreateElement(tagName)
}
