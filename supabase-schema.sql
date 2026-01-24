-- South Oak Chat - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
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
CREATE TABLE IF NOT EXISTS scheduled_tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lead_id UUID REFERENCES leads(id),
  tour_date DATE,
  tour_time TIME,
  confirmed BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Knowledge base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI configuration table
CREATE TABLE IF NOT EXISTS ai_config (
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
)
ON CONFLICT DO NOTHING;

-- Insert initial knowledge base entries
INSERT INTO knowledge_base (category, title, content) VALUES
('property', 'Property Overview', 'South Oak Apartments is located at 104 S Oak St, Spokane, WA 99204 in the historic Browne''s Addition neighborhood.'),
('property', 'Contact Information', 'Property Manager: Steve Francis. Part of Mccoy Real Estate LLC. Managing Partner: Bill McCoy.'),
('neighborhood', 'Location', 'Browne''s Addition is a historic neighborhood with tree-lined streets and classic architecture. Walking distance to downtown Spokane, close to Sacred Heart Medical Center, and near Gonzaga University.'),
('policies', 'Tour Information', 'Tours are available by appointment. You''ll meet with Steve, our property manager, who can show you available units and answer any questions.')
ON CONFLICT DO NOTHING;

-- Chat sessions table (for analytics)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  user_message_count INTEGER DEFAULT 0,
  lead_captured BOOLEAN DEFAULT FALSE,
  lead_id UUID,
  tour_booked BOOLEAN DEFAULT FALSE,
  collected_name BOOLEAN DEFAULT FALSE,
  collected_phone BOOLEAN DEFAULT FALSE,
  collected_email BOOLEAN DEFAULT FALSE,
  collected_tour_date BOOLEAN DEFAULT FALSE
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead_captured ON chat_sessions(lead_captured);

-- Enable Row Level Security (optional, for production)
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scheduled_tours ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
