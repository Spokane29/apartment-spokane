# South Oak AI Chat Assistant

AI-powered leasing assistant for South Oak Apartments at 104 S Oak St, Spokane.

## Quick Start

### 1. Set up Supabase

1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and API keys from Settings > API

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Servers

```bash
# Backend only
npm run dev:backend

# Frontend only (in another terminal)
npm run dev:frontend

# Admin dashboard (in another terminal)
npm run dev:admin
```

- Backend API: http://localhost:3001
- Chat Widget: http://localhost:3000
- Admin Dashboard: http://localhost:3002

## Project Structure

```
/apartment-spokane
├── /backend          # Express API server
│   ├── /routes       # API endpoints
│   ├── /services     # Claude, Supabase, LeasingVoice
│   └── server.js     # Entry point
├── /frontend         # React chat widget
│   └── /src
│       ├── /components
│       └── /hooks
├── /admin            # React admin dashboard
│   └── /src/pages
└── supabase-schema.sql
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send chat message |
| `/api/chat/greeting` | GET | Get initial greeting |
| `/api/leads` | GET/POST | List/create leads |
| `/api/leads/:id` | GET/PATCH | Get/update lead |
| `/api/schedule` | GET/POST | List/create tours |
| `/api/admin/knowledge` | GET/POST/PUT | Manage knowledge base |
| `/api/admin/config` | GET/PUT | Manage AI settings |

## Embedding the Chat Widget

Build the widget and include on your site:

```bash
cd frontend && npm run build
```

Then add to your HTML:
```html
<script src="path/to/south-oak-chat.js"></script>
```

## Admin Dashboard

Access at http://localhost:3002 to:
- View and manage leads
- Edit knowledge base content
- Configure AI personality and greeting

## Notes

- Manager: Steve Francis
- Property: Mccoy Real Estate LLC
- Fair housing compliance is built into the AI system prompt
