-- Run this in Supabase SQL Editor to create the chat analytics table

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  user_message_count INTEGER DEFAULT 0,
  lead_captured BOOLEAN DEFAULT FALSE,
  lead_id UUID,
  tour_booked BOOLEAN DEFAULT FALSE,
  collected_name BOOLEAN DEFAULT FALSE,
  collected_phone BOOLEAN DEFAULT FALSE,
  collected_email BOOLEAN DEFAULT FALSE,
  collected_tour_date BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  referrer TEXT,
  ip_address TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead_captured ON chat_sessions(lead_captured);
