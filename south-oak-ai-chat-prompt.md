# AI Leasing Assistant for South Oak Apartments

## Project Overview

Build a full-stack AI chat system for 104 S Oak St, Spokane (South Oak Apartments) that replaces the current contact form. The chat acts as a friendly leasing assistant that answers questions, collects lead information naturally through conversation, and schedules tours.

---

## Tech Stack

- **Frontend:** React component (chat widget)
- **Backend:** Node.js/Express API
- **Database:** Supabase
- **AI:** Anthropic Claude API

---

## Core Features

### 1. Chat Widget (Frontend)

- Floating chat bubble that expands to chat window
- Message history display
- Typing indicators
- Mobile responsive
- Professional design: slate/charcoal colors, clean UI
- **NO generic AI purple/blue themes**

### 2. Backend API Routes

| Route | Purpose |
|-------|---------|
| `/api/chat` | Handles conversation with Claude |
| `/api/leads` | Stores collected lead data to Supabase |
| `/api/schedule` | Handles tour scheduling |
| `/api/admin/knowledge` | CRUD for knowledge base |
| `/api/admin/config` | AI personality/rules settings |

### 3. Admin Dashboard (Simple)

- View/edit knowledge base content
- View collected leads
- View scheduled tours
- Edit AI personality and rules
- No authentication needed initially (add later)

### 4. Knowledge Base System

- Markdown or JSON files the AI references
- Easy to update without code changes
- Stored in database for admin editing
- Categories: property info, pricing, amenities, policies, neighborhood, FAQs

---

## AI Behavior Configuration

### Personality

```
NAME: Sona (configurable in admin)

TONE:
- Friendly, conversational, helpful
- Like a knowledgeable neighbor, not a salesperson
- Never pushy or salesy
- Professional but warm

COMMUNICATION STYLE:
- Answer questions directly without overwhelming with info
- Ask ONE question at a time when gathering info
- Keep responses concise (2-3 sentences typical)
- Use natural conversation flow, not scripted responses
```

### Goals (Priority Order)

1. Answer the prospect's immediate question first
2. Naturally learn what they're looking for
3. Collect contact info through conversation (NOT a form dump)
4. Offer to schedule a tour when timing is right

### Required Information to Collect

| Field | Required | How to Ask |
|-------|----------|------------|
| First name | Yes | Natural intro ("What's your name?" or "Who am I chatting with?") |
| Phone number | Yes | "What's the best number to reach you?" |
| Email | Encouraged | "And your email for confirmation?" |
| Move-in timeframe | Yes | "When are you looking to move?" |
| What brought them here | Yes | "What caught your eye about South Oak?" |

### Tour Scheduling Behavior

- Offer available tour times naturally
- Confirm day/time preference
- Collect contact info if not already gathered
- Provide confirmation details
- Mention they'll meet Steve (the manager)

### Boundaries & Restrictions

```
DO:
- Answer questions from knowledge base
- Be helpful and friendly
- Offer to have Steve follow up for complex questions
- Stay fair housing compliant

DO NOT:
- Make up information not in knowledge base
- Discuss other tenants or occupancy details
- Negotiate pricing or offer deals
- Use discriminatory language (familial status, race, religion, etc.)
- Be pushy about tours or contact info
- Ask multiple questions at once
```

### Example Conversation Flow

```
User: "Hi, do you have any 1-bedrooms available?"

Sona: "Hi! Yes, we do have 1-bedroom units available at South Oak. 
They're [size] sq ft and rent for [price]/month. Were you looking 
to move soon?"

User: "Yeah, probably next month"

Sona: "Perfect timing! I'm Sona by the way - what's your name?"

User: "I'm Mike"

Sona: "Nice to meet you, Mike! Would you like to schedule a tour? 
Our manager Steve can show you the available units and answer 
any questions in person."
```

---

## Initial Knowledge Base Content

### Property Information

```markdown
## South Oak Apartments

**Address:** 104 S Oak St, Spokane, WA 99204
**Neighborhood:** Historic Spokane neighborhood

### Units
- [Add unit types, sizes, and current pricing]

### Availability
- [Add current availability]

### Lease Terms
- [Add standard lease length, deposit requirements]
```

### Amenities

```markdown
## Amenities
- [List all amenities]
- [Parking details]
- [Laundry facilities]
- [Storage options]
```

### Location & Neighborhood

```markdown
## Location & Neighborhood

Historic neighborhood with tree-lined streets and classic architecture.

### Nearby
- Walking distance to downtown Spokane
- Close to Sacred Heart Medical Center
- Near Gonzaga University
- [Add restaurants, parks, etc.]

### Commute Times
- [Add relevant commute info]
```

### Policies

```markdown
## Policies

### Pets
- [Pet policy details]

### Parking
- [Parking policy and fees]

### Utilities
- [What's included/not included]

### Application Requirements
- [Basic requirements]
```

### FAQs

```markdown
## Frequently Asked Questions

**Q: Is there parking?**
A: [Answer]

**Q: Are pets allowed?**
A: [Answer]

**Q: What utilities are included?**
A: [Answer]

**Q: How do I apply?**
A: [Answer]
```

---

## Database Schema (Supabase)

```sql
-- Leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  move_in_date TEXT,
  property_interest TEXT DEFAULT '104 S Oak',
  source TEXT DEFAULT 'website-chat',
  message TEXT,
  chat_transcript JSONB,
  status TEXT DEFAULT 'new'
);

-- Scheduled tours table
CREATE TABLE scheduled_tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lead_id UUID REFERENCES leads(id),
  tour_date DATE,
  tour_time TIME,
  confirmed BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Knowledge base table
CREATE TABLE knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI configuration table
CREATE TABLE ai_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assistant_name TEXT DEFAULT 'Sona',
  personality_rules TEXT,
  greeting_message TEXT DEFAULT 'Hi! I''m Sona, the virtual assistant for South Oak Apartments. How can I help you today?',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default AI config
INSERT INTO ai_config (personality_rules, greeting_message)
VALUES (
  'Friendly and conversational. Answer questions directly. Ask one question at a time. Never be pushy.',
  'Hi! I''m Sona, the virtual assistant for South Oak Apartments. How can I help you today?'
);
```

---

## External Integration

### LeasingVoice API

Send lead data to existing LeasingVoice system:

```javascript
// POST to https://leasingvoice.com/api/leads/external
{
  firstName: "Mike",
  lastName: "Smith",
  phone: "509-555-1234",
  email: "mike@email.com",
  propertyInterest: "104 S Oak",
  moveInDate: "February 2025",
  message: "Interested in 1-bedroom",
  source: "website-chat"
}
```

---

## Project File Structure

```
/south-oak-chat
├── /frontend
│   ├── /components
│   │   ├── ChatWidget.jsx
│   │   ├── ChatBubble.jsx
│   │   ├── ChatWindow.jsx
│   │   ├── MessageList.jsx
│   │   ├── MessageInput.jsx
│   │   └── TypingIndicator.jsx
│   ├── /hooks
│   │   └── useChat.js
│   ├── /styles
│   │   └── chat.css
│   └── index.js
│
├── /backend
│   ├── /routes
│   │   ├── chat.js
│   │   ├── leads.js
│   │   ├── schedule.js
│   │   └── admin.js
│   ├── /services
│   │   ├── claude.js
│   │   ├── supabase.js
│   │   └── leasingvoice.js
│   ├── /middleware
│   │   └── errorHandler.js
│   ├── /config
│   │   └── index.js
│   └── server.js
│
├── /admin
│   ├── /pages
│   │   ├── Dashboard.jsx
│   │   ├── Leads.jsx
│   │   ├── KnowledgeBase.jsx
│   │   └── Settings.jsx
│   └── index.js
│
├── .env.example
├── package.json
└── README.md
```

---

## Environment Variables

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Anthropic
ANTHROPIC_API_KEY=your_api_key

# LeasingVoice
LEASINGVOICE_API_URL=https://leasingvoice.com/api/leads/external

# Server
PORT=3001
NODE_ENV=development
```

---

## Build Order

### Phase 1: Backend Foundation
1. Set up Express server with basic routes
2. Configure Supabase connection
3. Create Claude service with system prompt
4. Build knowledge base loader
5. Test chat endpoint

### Phase 2: Chat Logic
1. Implement conversation state management
2. Add lead extraction logic
3. Build tour scheduling flow
4. Connect to LeasingVoice API

### Phase 3: Frontend Widget
1. Build chat bubble component
2. Create chat window UI
3. Implement message display
4. Add typing indicators
5. Style with slate/professional theme

### Phase 4: Admin Dashboard
1. Simple React dashboard
2. Knowledge base editor
3. Leads list view
4. AI config settings

### Phase 5: Integration & Polish
1. Embed widget in South Oak site
2. Test full flow
3. Mobile optimization
4. Error handling

---

## Design Notes

### Color Palette (Match existing site)

```css
--primary: #475569;      /* Slate 600 */
--primary-dark: #334155; /* Slate 700 */
--accent: #0ea5e9;       /* Sky 500 - for CTAs */
--background: #f8fafc;   /* Slate 50 */
--text: #1e293b;         /* Slate 800 */
--text-light: #64748b;   /* Slate 500 */
--border: #e2e8f0;       /* Slate 200 */
```

### Chat Widget Specs

- Bubble: 60px circle, bottom-right corner
- Window: 380px wide, 500px tall (desktop)
- Mobile: Full width, 90vh height
- Smooth open/close animation
- Sound off by default

---

## Notes

- This replaces the existing form on the South Oak site
- Manager is Steve Francis
- Property is part of Mccoy Real Estate LLC
- Bill McCoy is managing partner
- Keep responses concise - users on mobile
- Fair housing compliance is critical
