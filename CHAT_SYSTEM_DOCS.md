# AI Chat & Voice System - Complete Build Guide

A complete guide to building an AI-powered chat and voice system for lead capture. This document covers all features, backend APIs, admin dashboard, and database setup. Copy this to any project directory as a reference for building similar systems.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Quick Start Checklist](#quick-start-checklist)
3. [Environment Variables](#environment-variables)
4. [Database Setup (Supabase)](#database-setup-supabase)
5. [Backend API Reference](#backend-api-reference)
6. [Admin Dashboard](#admin-dashboard)
7. [Frontend Chat Components](#frontend-chat-components)
8. [AI Features](#ai-features)
9. [Voice Features](#voice-features)
10. [Lead Capture Flow](#lead-capture-flow)
11. [Customization Guide](#customization-guide)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## System Overview

A complete AI chat system with:

- **AI Chat**: Claude-powered conversational AI with custom knowledge base
- **Voice Input**: Browser speech recognition (Web Speech API)
- **Voice Output**: ElevenLabs text-to-speech for AI responses
- **Hands-Free Mode**: Auto-listen after AI speaks (works on both mobile and desktop)
- **Lead Capture**: Automatic extraction of name, phone, email, tour date/time
- **Session Persistence**: Database-backed conversation history
- **Admin Dashboard**: Configure AI behavior, manage knowledge base, view leads and analytics

### Tech Stack
| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Vercel Serverless Functions (Node.js ESM) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Voice TTS | ElevenLabs API (eleven_turbo_v2) |
| Voice STT | Web Speech API (browser native) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React/Vite)                      │
├───────────────────────────┬─────────────────────────────────────┤
│   EmbeddedChat.tsx        │   Admin Dashboard (/admin)          │
│   - Voice input/output    │   - Dashboard.jsx (analytics)       │
│   - Auto-listen mode      │   - Leads.jsx (lead management)     │
│                           │   - KnowledgeBase.jsx (AI content)  │
│   ChatWidget.tsx          │   - Settings.jsx (AI config)        │
│   - Text-only popup       │                                     │
└───────────────────────────┴─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (/api)                             │
├─────────────────────────────────────────────────────────────────┤
│  /api/chat          │ Main chat - AI responses, lead extraction │
│  /api/chat/greeting │ Initial greeting + new session ID         │
│  /api/voice/speak   │ Text-to-speech (ElevenLabs)              │
│  /api/admin/login   │ Admin authentication                      │
│  /api/admin/config  │ AI settings (greeting, rules, template)   │
│  /api/admin/knowledge│ Knowledge base CRUD                      │
│  /api/admin/analytics│ Usage statistics                         │
│  /api/leads         │ Lead CRUD operations                      │
│  /api/track         │ Page view tracking                        │
└─────────────────────────────────────────────────────────────────┘
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────────┐
            │  Claude   │   │ ElevenLabs│   │   Supabase    │
            │   API     │   │    API    │   │  (PostgreSQL) │
            └───────────┘   └───────────┘   └───────────────┘
```

---

## Quick Start Checklist

### 1. External Services Setup
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Create Anthropic account at [console.anthropic.com](https://console.anthropic.com)
- [ ] Create ElevenLabs account at [elevenlabs.io](https://elevenlabs.io) (Creative Platform)
- [ ] Enable "text_to_speech" permission on ElevenLabs API key

### 2. Database Setup
- [ ] Create all required tables (see Database Setup section)
- [ ] Insert initial ai_config row

### 3. Environment Variables
- [ ] Add all required env vars to Vercel (see Environment Variables section)

### 4. Code Setup
- [ ] Create all API files in `/api` directory
- [ ] Create frontend components
- [ ] Create admin dashboard

### 5. Deployment
- [ ] Push to GitHub
- [ ] Connect to Vercel
- [ ] Deploy

---

## Environment Variables

```bash
# ===========================================
# SUPABASE - Database
# ===========================================
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
# Get from: Supabase Dashboard > Settings > API

# ===========================================
# ANTHROPIC - AI Chat
# ===========================================
ANTHROPIC_API_KEY=sk-ant-api03-...
# Get from: console.anthropic.com > API Keys

# ===========================================
# ELEVENLABS - Voice (Text-to-Speech)
# ===========================================
ELEVEN_LABS_API_KEY=sk_...
# Get from: elevenlabs.io > Profile > API Keys
# IMPORTANT: Enable "text_to_speech" permission on the key

ELEVEN_LABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
# Optional - defaults to "Rachel" voice
# Browse voices at: elevenlabs.io/voice-library

# ===========================================
# EXTERNAL LEAD API (Optional)
# ===========================================
LEASINGVOICE_API_URL=https://example.com/api/leads/external
# Only if sending leads to external CRM
```

---

## Database Setup (Supabase)

Run these SQL commands in Supabase SQL Editor:

### Table: chat_sessions
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  messages JSONB DEFAULT '[]',
  collected_info JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  user_message_count INTEGER DEFAULT 0,
  lead_captured BOOLEAN DEFAULT FALSE,
  lead_id UUID,
  tour_booked BOOLEAN DEFAULT FALSE,
  collected_name BOOLEAN DEFAULT FALSE,
  collected_phone BOOLEAN DEFAULT FALSE,
  collected_email BOOLEAN DEFAULT FALSE,
  collected_tour_date BOOLEAN DEFAULT FALSE,
  lead_sent_to_leasingvoice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);
```

### Table: leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  move_in_date TEXT,
  chat_transcript JSONB,
  source TEXT DEFAULT 'website-chat',
  property_interest TEXT,
  status TEXT DEFAULT 'new',
  leasingvoice_id TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_status ON leads(status);
```

### Table: ai_config
```sql
CREATE TABLE ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_name TEXT DEFAULT 'Virtual Assistant',
  greeting_message TEXT DEFAULT 'Hi! How can I help you today?',
  personality_rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial config row
INSERT INTO ai_config (assistant_name, greeting_message)
VALUES ('Sona', 'Hi! I''m the virtual assistant. How can I help you today?');
```

### Table: knowledge_base
```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);

-- Categories used:
-- 'complete' - Main knowledge base document (property info, policies, etc.)
-- 'template' - Tour confirmation message template
-- 'rules' - Custom AI behavior rules
```

### Table: page_views (for analytics)
```sql
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT,
  visitor_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_page_views_created_at ON page_views(created_at);
CREATE INDEX idx_page_views_visitor_id ON page_views(visitor_id);
```

---

## Backend API Reference

All API files use ES Modules (`export default`) and go in the `/api` directory.

### /api/chat/index.js - Main Chat Endpoint

The core chat API that handles:
- Session management (create/retrieve from database)
- Message processing with Claude AI
- Lead information extraction (regex patterns)
- Lead storage to Supabase
- External API integration (optional)

**Request:**
```json
POST /api/chat
{
  "message": "I'd like to schedule a tour",
  "sessionId": "uuid-or-null-for-new"
}
```

**Response:**
```json
{
  "message": "Great! When would you like to come by?",
  "sessionId": "uuid-session-id"
}
```

**Key Features:**
- Builds dynamic system prompt from knowledge base + collected info
- Extracts name, phone, email, tour date/time automatically
- Tracks what info has been collected to prevent re-asking
- Saves leads when minimum info (name + phone) is collected

### /api/chat/greeting.js - Initial Greeting

Returns the greeting message and creates a new session ID.

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: config } = await supabase.from('ai_config').select('greeting_message').single();
    const greeting = config?.greeting_message || "Hi! How can I help you today?";
    const sessionId = crypto.randomUUID();

    res.json({ message: greeting, sessionId });
  } catch (error) {
    console.error('Greeting error:', error);
    res.status(500).json({ error: 'Failed to get greeting' });
  }
}
```

### /api/voice/speak.js - Text-to-Speech

Converts text to speech using ElevenLabs API.

**Key Features:**
- Text preprocessing for natural speech (`convertToSpeakable` function)
- Returns base64-encoded MP3 audio
- Uses `eleven_turbo_v2` model for low latency

**Text Preprocessing Examples:**
```javascript
function convertToSpeakable(text) {
  let result = text;

  // Prices: "$1,200" → "twelve hundred dollars"
  result = result.replace(/\$1,200/g, 'twelve hundred dollars');
  result = result.replace(/\$1200/g, 'twelve hundred dollars');

  // Time: "/month" → "a month"
  result = result.replace(/\/month/gi, ' a month');
  result = result.replace(/\/mo/gi, ' a month');

  // Addresses: "123 S Oak St" → "123 South Oak Street"
  result = result.replace(/(\d+)\s+S\s+/g, '$1 South ');
  result = result.replace(/\bSt\b/g, 'Street');
  result = result.replace(/\bAve\b/g, 'Avenue');

  // Phone: "(888) 555-1234" → "888 555 1234"
  result = result.replace(/\((\d{3})\)\s*(\d{3})-(\d{4})/g, '$1 $2 $3');

  return result;
}
```

**Request:**
```json
POST /api/voice/speak
{ "text": "The rent is $1,200 per month." }
```

**Response:**
```json
{ "audio": "base64-mp3-data...", "contentType": "audio/mpeg" }
```

### /api/admin/login.js - Admin Authentication

Simple credential-based login. Returns token stored in localStorage.

```javascript
// Simple admin login - update credentials for production!
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'securepassword';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}
```

**Production Note:** Replace with proper JWT authentication or OAuth.

### /api/admin/config.js - AI Configuration

GET/PUT for AI settings (greeting, rules, confirmation template).

**GET Response:**
```json
{
  "assistant_name": "Sona",
  "greeting_message": "Hi! How can I help?",
  "personality_rules": "Be friendly and helpful",
  "confirmation_template": "Thanks {name}! See you on {tour_date}.",
  "ai_rules": "Keep responses under 2 sentences"
}
```

### /api/admin/knowledge.js - Knowledge Base

GET/PUT for the main knowledge base document (category='complete').

### /api/admin/analytics.js - Usage Statistics

Returns chat session statistics for the dashboard.

**Response:**
```json
{
  "summary": {
    "totalSessions": 45,
    "totalLeads": 12,
    "toursBooked": 8,
    "leadConversionRate": "26.7%",
    "tourConversionRate": "17.8%",
    "avgMessagesPerSession": 6.2
  }
}
```

### /api/leads/index.js - Lead Management

Full CRUD for leads with filtering and bulk operations.

**Endpoints:**
- `GET /api/leads` - List leads (optional `?days=7` filter)
- `GET /api/leads/:id` - Get single lead
- `PATCH /api/leads/:id` - Update lead status
- `DELETE /api/leads?id=xxx` - Delete single lead
- `DELETE /api/leads?ids=xxx,yyy` - Bulk delete leads

---

## Admin Dashboard

A separate React app in `/admin` directory with its own build.

### Directory Structure
```
/admin
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── index.jsx          # Main app with router and login
    ├── styles.css         # Dashboard styles
    └── pages/
        ├── Dashboard.jsx  # Analytics overview
        ├── Leads.jsx      # Lead management table
        ├── KnowledgeBase.jsx  # Property info editor
        └── Settings.jsx   # AI configuration
```

### package.json
```json
{
  "name": "admin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3002",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.8"
  }
}
```

### vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  build: {
    outDir: '../dist/admin',
    emptyOutDir: true
  }
})
```

### Dashboard Features

#### 1. Dashboard Page (Dashboard.jsx)
- Page views and unique visitors
- Chat sessions count
- Leads captured
- Tours booked
- Conversion rates
- Recent leads table
- Date range filter (Today, 7 Days, 30 Days)

#### 2. Leads Page (Leads.jsx)
- Full leads table with sorting
- Status management (New → Contacted → Scheduled → Toured → Applied → Closed)
- View lead details + chat transcript
- Single and bulk delete
- Checkbox selection

#### 3. Knowledge Base Page (KnowledgeBase.jsx)
- Large textarea for property information
- Markdown-style formatting supported
- Auto-saves with feedback message

#### 4. Settings Page (Settings.jsx)
- Assistant name
- Greeting message
- Personality rules
- Tour confirmation template (with placeholders)
- AI behavior rules

### Admin Authentication Flow
1. Check localStorage for `admin_token`
2. If no token, show Login component
3. Login sends credentials to `/api/admin/login`
4. On success, store token in localStorage
5. Logout clears token

---

## Frontend Chat Components

### EmbeddedChat.tsx (Voice-Enabled)

Full-featured chat with voice input/output.

**Key State Variables:**
```typescript
const [messages, setMessages] = useState<Message[]>([])
const [input, setInput] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [sessionId, setSessionId] = useState<string | null>(null)
const [isListening, setIsListening] = useState(false)    // Mic recording
const [voiceEnabled, setVoiceEnabled] = useState(true)   // TTS toggle
const [isSpeaking, setIsSpeaking] = useState(false)      // Audio playing
const voiceEnabledRef = useRef(true)  // Ref for callbacks (avoids stale closure)
```

**Key Functions:**
- `initChat()` - Fetch greeting, create session
- `sendMessage()` - Send message to API, handle response
- `speakText()` - Convert text to speech, play audio
- `startListening()` - Begin speech recognition
- `autoStartListening()` - Auto-start mic after AI speaks (5 second timeout)
- `initAudioContext()` - Initialize Web Audio API (required for mobile)

### ChatWidget.tsx (Text-Only Popup)

Simpler chat widget that appears as floating bubble.

**Features:**
- Floating chat bubble (bottom-right)
- Click to expand chat window
- No voice features
- Mobile responsive

---

## AI Features

### System Prompt Structure

The AI system prompt is dynamically built from multiple sources:

```
1. Base Role + Goals
   "You are the virtual leasing assistant for [Property Name]..."

2. Knowledge Base Content
   [All content from knowledge_base table, category='complete']

3. Collected Info Tracking
   "ALREADY COLLECTED (do NOT ask for these again):
   - Name: John (collected)
   - Phone: 555-1234 (collected)
   - Email: NOT YET
   - Tour Date: Saturday (collected)
   - Tour Time: NOT YET"

4. Critical Rules
   - Maximum 2 sentences per response
   - No exclamation points
   - Never restart conversation mid-chat
   - Ask for ONE missing piece at a time
   - Order: tour date → tour time → name → phone → email

5. Confirmation Template
   [From knowledge_base, category='template']

6. Custom Rules
   [From knowledge_base, category='rules']
```

### Lead Info Extraction Patterns

Automatic extraction from user messages:

```javascript
// Name patterns
/(?:I'm|I am|my name is|this is|call me)\s+([A-Z][a-z]+)/i
/^([A-Z][a-z]+\s+[A-Z]?[a-z]+)$/im  // "Joe Smith"

// Phone pattern
/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})\b/

// Email patterns
/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/
/([a-zA-Z0-9._%+-]+\s*(?:@|at)\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i

// Tour date
/(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/i

// Tour time
/(\d{1,2}(?::\d{2})?\s*(?:am|pm)|morning|afternoon|noon|evening)/i
```

### Conversation Flow Rules

Critical rules enforced in system prompt:
- Maximum 2 sentences per response
- No exclamation points (professional tone)
- Never restart conversation or say "Hi there" mid-chat
- Never repeat questions already answered
- Ask for info in order: tour date → tour time → name → phone → email
- If input looks invalid, ask to retry (don't restart)
- When user agrees to tour, immediately ask for date

---

## Voice Features

### Speech Recognition (STT)

Uses browser's Web Speech API:

```typescript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const recognition = new SpeechRecognition()
recognition.continuous = false
recognition.interimResults = false
recognition.lang = 'en-US'

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript
  sendMessage(transcript)
}

recognition.onerror = (event) => {
  console.error('Speech error:', event.error)
}
```

**Browser Support:**
- Chrome: Full support
- Safari: Partial (webkit prefix)
- Firefox: Not supported
- Edge: Full support

### Text-to-Speech (TTS)

Uses ElevenLabs API with base64 audio response.

**Voice Settings:**
```javascript
{
  model_id: 'eleven_turbo_v2',  // Low latency model
  voice_settings: {
    stability: 0.4,        // Lower = more expressive
    similarity_boost: 0.8, // Voice consistency
    style: 0.3,           // Style exaggeration
    use_speaker_boost: true
  }
}
```

### Mobile Audio Playback

Mobile browsers require user gesture to play audio:

```typescript
// Initialize AudioContext on first user interaction
const initAudioContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  audioContextRef.current = new AudioContextClass()

  // Resume if suspended (Safari)
  if (audioContextRef.current.state === 'suspended') {
    audioContextRef.current.resume()
  }
}

// Play audio using Web Audio API (more reliable than HTML5 Audio)
const playAudio = async (base64Audio) => {
  const ctx = audioContextRef.current
  if (ctx.state === 'suspended') await ctx.resume()

  // Decode base64 to ArrayBuffer
  const binaryString = atob(base64Audio)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Decode and play
  const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0))
  const source = ctx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(ctx.destination)
  source.onended = () => autoStartListening()
  source.start()
}
```

### Auto-Listen Mode (Hands-Free)

After AI speaks, automatically activate microphone for 5 seconds. This enables true hands-free operation on both **mobile and desktop** browsers - users can have a full conversation without touching any buttons.

**Supported platforms:**
- Chrome Desktop: Full support
- Chrome Mobile (Android): Full support
- Safari Mobile (iOS): Full support with workarounds
- Edge: Full support

**Important considerations for mobile:**
1. Use a ref to track `voiceEnabled` state to avoid stale closures in callbacks
2. Recreate the recognition instance each time - mobile browsers get into bad state after multiple start/stop cycles
3. Add retry mechanism if recognition.start() fails

```typescript
// State and ref - ref avoids stale closure in audio callbacks
const [voiceEnabled, setVoiceEnabled] = useState(true)
const voiceEnabledRef = useRef(true)

// Keep ref in sync with state
useEffect(() => {
  voiceEnabledRef.current = voiceEnabled
}, [voiceEnabled])

// Create/recreate speech recognition instance
const createRecognition = () => {
  if (!SpeechRecognition) return null

  const recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    if (transcript.trim()) {
      handleVoiceInput(transcript.trim())
    }
  }

  recognition.onerror = (event) => {
    // Ignore 'aborted' and 'no-speech' - they're expected
    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      console.error('Speech recognition error:', event.error)
    }
    setIsListening(false)
  }

  recognition.onend = () => setIsListening(false)
  return recognition
}

const autoStartListening = (retryCount = 0) => {
  const isVoiceEnabled = voiceEnabledRef.current
  if (!isVoiceEnabled || !SpeechRecognition) return

  // Clear any existing timeout
  if (listenTimeoutRef.current) {
    clearTimeout(listenTimeoutRef.current)
    listenTimeoutRef.current = null
  }

  // CRITICAL: Fully cleanup old recognition before creating new
  if (recognitionRef.current) {
    try { recognitionRef.current.abort() } catch (e) {}
    recognitionRef.current = null
  }

  // Longer delay for mobile - give browser time to release mic
  const delay = retryCount === 0 ? 500 : 300

  setTimeout(() => {
    // ALWAYS create fresh recognition instance
    recognitionRef.current = createRecognition()
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.start()
      setIsListening(true)

      // Auto-stop after 5 seconds if no speech
      listenTimeoutRef.current = setTimeout(() => {
        setIsListening(false)
        recognitionRef.current?.stop()
      }, 5000)
    } catch (err) {
      // Retry up to 2 times
      if (retryCount < 2) {
        setTimeout(() => autoStartListening(retryCount + 1), 600)
      }
    }
  }, delay)
}
```

**Why recreate recognition each time:** Mobile browsers (especially Safari) can get the SpeechRecognition object into a bad state after multiple start/stop cycles. Creating a fresh instance each time is more reliable than reusing the same object.

### Critical Mobile Considerations

For reliable hands-free on mobile, you must also:

1. **Use HTML5 Audio instead of Web Audio API** - Web Audio conflicts with mic on mobile:
```typescript
// DON'T use Web Audio API for playback - it conflicts with microphone
// Use simple HTML5 Audio instead:
const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`)
audio.onended = () => {
  setIsSpeaking(false)
  setTimeout(() => autoStartListening(), 200) // Small delay before mic
}
audio.play()
```

2. **Release mic stream tracks and re-request** - Mobile has limited mic resources:
```typescript
const micStreamRef = useRef<MediaStream | null>(null)

const autoStartListening = async () => {
  // CRITICAL: Release previous stream completely
  if (micStreamRef.current) {
    micStreamRef.current.getTracks().forEach(track => track.stop())
    micStreamRef.current = null
  }

  // Re-request fresh mic access
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    micStreamRef.current = stream // Store for cleanup next time
  } catch (err) {
    console.error('Mic permission lost')
    return
  }
  // ... then create recognition and start
}

// Also release in handleVoiceInput after getting speech:
if (micStreamRef.current) {
  micStreamRef.current.getTracks().forEach(track => track.stop())
  micStreamRef.current = null
}
```

3. **Use longer delays on mobile** - 600ms initial, 400ms on retry gives browser time to release resources.

---

## Lead Capture Flow

```
┌─────────────────────────────────────────┐
│           User Opens Chat               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│   GET /api/chat/greeting                │
│   Returns: greeting message + sessionId │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          User Asks Question             │◄────────┐
└─────────────────────────────────────────┘         │
                    │                               │
                    ▼                               │
┌─────────────────────────────────────────┐         │
│   POST /api/chat                        │         │
│   - Load session from DB                │         │
│   - Extract lead info from message      │         │
│   - Build system prompt with KB         │         │
│   - Call Claude API                     │         │
│   - Save session + extracted info       │         │
└─────────────────────────────────────────┘         │
                    │                               │
                    ▼                               │
┌─────────────────────────────────────────┐         │
│   Has minimum info? (name + phone)      │         │
└─────────────────────────────────────────┘         │
          │                    │                    │
          │ No                 │ Yes                │
          │                    ▼                    │
          │    ┌──────────────────────────┐         │
          │    │ Save lead to Supabase    │         │
          │    │ Send to external API     │         │
          │    └──────────────────────────┘         │
          │                    │                    │
          └────────────────────┴────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│   Return AI response to frontend        │
│   (Voice: also call /api/voice/speak)   │
└─────────────────────────────────────────┘
```

---

## Customization Guide

### Adapting for a New Property/Business

| What to Change | Where | How |
|----------------|-------|-----|
| Property info | Admin > Knowledge Base | Edit all property details |
| Greeting message | Admin > Settings | Update "Greeting Message" field |
| AI personality | Admin > Settings | Update "Personality Rules" |
| Confirmation message | Admin > Settings | Update template with placeholders |
| Branding colors | CSS files | Change primary color (#475569) |
| Avatar letter | Components | Change "S" to your letter |
| External lead API | `/api/chat/index.js` | Modify `sendToLeadsAPI()` function |
| Admin credentials | `/api/admin/login.js` | Change email/password constants |
| Voice | Environment vars | Set different `ELEVEN_LABS_VOICE_ID` |
| Speech preprocessing | `/api/voice/speak.js` | Add domain-specific conversions |

### Key Files Summary

```
/api
├── chat/
│   ├── index.js        # Main chat - MODIFY for custom lead handling
│   └── greeting.js     # Simple, rarely needs changes
├── voice/
│   └── speak.js        # MODIFY convertToSpeakable() for your domain
├── admin/
│   ├── login.js        # MODIFY credentials for production
│   ├── config.js       # Rarely needs changes
│   ├── knowledge.js    # Rarely needs changes
│   └── analytics.js    # Rarely needs changes
└── leads/
    └── index.js        # Rarely needs changes

/src/components/chat
├── EmbeddedChat.tsx    # MODIFY for branding, layout
├── embedded-chat.css   # MODIFY for colors, sizing
├── ChatWidget.tsx      # MODIFY for branding
└── chat.css            # MODIFY for colors, sizing

/admin/src
├── index.jsx           # MODIFY header text
├── styles.css          # MODIFY colors
└── pages/
    ├── Dashboard.jsx   # Rarely needs changes
    ├── Leads.jsx       # Rarely needs changes
    ├── KnowledgeBase.jsx # Rarely needs changes
    └── Settings.jsx    # Rarely needs changes
```

---

## Deployment

### Vercel Setup

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/you/repo.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Add Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all variables from Environment Variables section

4. **Configure Admin Build**
   Add to root `package.json`:
   ```json
   {
     "scripts": {
       "build": "vite build",
       "build:admin": "cd admin && npm install && npm run build"
     }
   }
   ```

   Or use `vercel.json`:
   ```json
   {
     "buildCommand": "npm run build && npm run build:admin"
   }
   ```

### File Structure for Vercel

```
/
├── api/                    # Serverless functions (auto-detected)
│   ├── chat/
│   ├── voice/
│   ├── admin/
│   └── leads/
├── src/                    # Frontend source
├── admin/                  # Admin dashboard source
├── dist/                   # Built frontend (after build)
│   └── admin/             # Built admin (after build:admin)
├── package.json
├── vite.config.js
└── vercel.json            # Optional Vercel config
```

---

## Troubleshooting

### Voice Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| 401 from ElevenLabs | API key invalid or missing permission | Check key in env vars, enable "text_to_speech" permission |
| Robotic voice | Using old model | Use `eleven_turbo_v2` model |
| "$1,200" read literally | Missing preprocessing | Add to `convertToSpeakable()` |
| Mobile audio not playing | AudioContext not initialized | Initialize on first user tap |
| Mic not working on mobile | Permission not granted | Request permission explicitly |
| Auto-listen stops after first exchange | Stale closure in callback | Use `voiceEnabledRef` instead of state in callbacks |
| Auto-listen dies after 2-3 exchanges | Recognition object in bad state | Recreate recognition instance each time with `createRecognition()` |
| Auto-listen dies after 3+ exchanges | AudioContext holding mic resources | Suspend AudioContext after audio ends, re-request getUserMedia |
| Auto-listen dies after 4-5 exchanges | Mic stream not fully released | Stop all tracks on micStreamRef before requesting new stream |

### AI Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| AI repeating questions | `collected_info` not in prompt | Check system prompt building |
| AI restarting conversation | Bug in prompt rules | Add "NEVER say Hi there mid-chat" rule |
| AI using exclamation points | Missing rule | Add "NO exclamation points" to rules |
| Session not persisting | DB issue | Check Supabase connection, session table |

### Database Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| "relation does not exist" | Table not created | Run CREATE TABLE SQL |
| Permission denied | Using anon key | Use service key for server-side |
| Data not saving | Insert error | Check table schema matches code |

### Deployment Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| API returning 500 | Missing env var | Add all env vars in Vercel |
| Admin not loading | Build not running | Check build:admin script runs |
| CORS errors | Vercel config | Shouldn't happen with same-origin |

---

## Dependencies

### Main App (package.json)
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "@supabase/supabase-js": "^2.91.0",
    "lucide-react": "^0.446.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.2",
    "vite": "^5.4.8"
  }
}
```

### Admin App (admin/package.json)
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.8"
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | - | Initial chat with Claude AI |
| 1.1 | - | Added ElevenLabs voice output |
| 1.2 | - | Added speech recognition input |
| 1.3 | - | Added auto-listen mode after AI speaks |
| 1.4 | - | Fixed mobile voice playback (Web Audio API) |
| 1.5 | - | Fixed AI conversation reset bug |
| 1.6 | - | Improved text-to-speech naturalness |
| 1.7 | - | Added admin dashboard documentation |
| 1.8 | - | Added conversation state tracking to prevent AI reset during tour booking |
| 1.9 | - | Fixed stale closure bug in auto-listen (voiceEnabledRef) |
| 1.10 | - | Fixed mobile recognition dying after 2 exchanges (recreate instance each time) |
| 1.11 | - | More aggressive mobile fix: longer delays, abort+null cleanup, 2 retries |
| 1.12 | - | Critical fix: suspend AudioContext after playback, re-request mic permission |
| 1.13 | - | Release mic stream tracks between interactions (fixes 4-5 exchange limit) |
| 1.14 | - | Switch to HTML5 Audio only - Web Audio API conflicts with mic on mobile |
| 1.15 | - | Confirmed hands-free mode working on both mobile and desktop browsers |

---

*Last updated: January 2026*
