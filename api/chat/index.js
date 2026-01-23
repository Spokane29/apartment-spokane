import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// In-memory session store (for serverless, consider using Redis or database)
const sessions = new Map();

async function buildSystemPrompt() {
  const [{ data: knowledgeBase }, { data: aiConfig }] = await Promise.all([
    supabase.from('knowledge_base').select('*').order('category'),
    supabase.from('ai_config').select('*').single(),
  ]);

  const assistantName = aiConfig?.assistant_name || 'Sona';
  const personalityRules = aiConfig?.personality_rules || 'Friendly and conversational.';
  const knowledgeContent = (knowledgeBase || []).map((e) => `## ${e.title}\n${e.content}`).join('\n\n');

  return `You are ${assistantName}, the virtual leasing assistant for South Oak Apartments at 104 S Oak St, Spokane, WA 99204 in Browne's Addition.

## YOUR PERSONALITY
${personalityRules}

## COMMUNICATION STYLE
- Answer questions directly without overwhelming with info
- Ask ONE question at a time when gathering info
- Keep responses concise (2-3 sentences typical)
- Use natural conversation flow
- Never be pushy or salesy

## YOUR GOALS (priority order)
1. Answer the prospect's immediate question first
2. Naturally learn what they're looking for
3. Collect contact info through conversation (NOT a form dump)
4. Offer to schedule a tour when timing is right

## INFORMATION TO COLLECT
- First name (required)
- Phone number (required)
- Email (encouraged)
- Move-in timeframe (required)

## TOUR SCHEDULING
- Property manager is Steve
- Offer tour times naturally
- Collect contact info if not gathered

## BOUNDARIES
DO NOT:
- Make up information not in knowledge base
- Discuss other tenants
- Negotiate pricing
- Use discriminatory language
- Be pushy

## KNOWLEDGE BASE
${knowledgeContent || 'Property info being updated. Offer to have Steve contact them.'}`;
}

function extractLeadInfo(messages) {
  const userText = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ');
  const leadInfo = {};

  const nameMatch = userText.match(/(?:I'm|I am|my name is|call me)\s+([A-Z][a-z]+)/i);
  if (nameMatch) leadInfo.first_name = nameMatch[1];

  const phoneMatch = userText.match(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/);
  if (phoneMatch) leadInfo.phone = phoneMatch[1].replace(/[-.\s]/g, '');

  const emailMatch = userText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) leadInfo.email = emailMatch[1].toLowerCase();

  const moveMatch = userText.match(/(?:move|moving).*(next month|this month|january|february|march|april|may|june|july|august|september|october|november|december|\d+ (?:weeks?|months?))/i);
  if (moveMatch) leadInfo.move_in_date = moveMatch[1];

  return Object.keys(leadInfo).length > 0 ? leadInfo : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    let session = sessions.get(sessionId) || { id: sessionId || crypto.randomUUID(), messages: [], leadId: null, collectedInfo: {} };
    if (!sessions.has(session.id)) sessions.set(session.id, session);

    session.messages.push({ role: 'user', content: message });

    const systemPrompt = await buildSystemPrompt();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: session.messages,
    });

    const assistantMessage = response.content[0].text;
    session.messages.push({ role: 'assistant', content: assistantMessage });

    const leadInfo = extractLeadInfo(session.messages);
    if (leadInfo) {
      session.collectedInfo = { ...session.collectedInfo, ...leadInfo };
      if (session.collectedInfo.first_name && session.collectedInfo.phone && !session.leadId) {
        const { data: lead } = await supabase.from('leads').insert([{
          ...session.collectedInfo,
          chat_transcript: session.messages,
          source: 'website-chat',
          property_interest: '104 S Oak',
        }]).select().single();
        if (lead) session.leadId = lead.id;
      } else if (session.leadId) {
        await supabase.from('leads').update({ ...session.collectedInfo, chat_transcript: session.messages }).eq('id', session.leadId);
      }
    }

    res.json({ message: assistantMessage, sessionId: session.id });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}
