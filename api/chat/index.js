import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// In-memory session store (for serverless, consider using Redis or database)
const sessions = new Map();

// Send lead to external leads API
async function sendToLeadsAPI(leadData) {
  // Use Vercel URL or fallback to production domain
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://apartment-spokane.vercel.app';
  const apiUrl = `${baseUrl}/api/leads/external`;

  const payload = {
    firstName: leadData.first_name || '',
    lastName: leadData.last_name || '',
    phone: leadData.phone || '',
    email: leadData.email || '',
    propertyInterest: 'South Oak Apartment',
    source: 'south-oak-website',
    companyId: '322039f9-b67b-4084-b806-387ba26c4810',
    message: leadData.tour_date
      ? `Tour requested for ${leadData.tour_date}${leadData.tour_time ? ' at ' + leadData.tour_time : ''}`
      : 'Interested via website chat'
  };

  try {
    console.log('Sending lead to:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      redirect: 'follow',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Leads API response:', result);
    return { success: response.ok, data: result };
  } catch (error) {
    console.error('Leads API error:', error.message);
    return { success: false, error: error.message };
  }
}

async function buildSystemPrompt(aiConfig) {
  const { data: knowledgeBase } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('category', { ascending: true });

  // Get confirmation template (stored separately or use default)
  const templateEntry = (knowledgeBase || []).find(e => e.category === 'template');
  const confirmationTemplate = templateEntry?.content ||
    "Got it, {name}! You're scheduled for {tour_date}. Steve will reach out at {phone} to confirm. See you soon!";

  // Combine all knowledge base entries (excluding template) into one document
  const knowledgeContent = (knowledgeBase || [])
    .filter(e => e.category !== 'template')
    .map((entry) => entry.content)
    .join('\n\n');

  // If we have substantial knowledge base content, use it as the primary instruction set
  if (knowledgeContent && knowledgeContent.trim().length > 100) {
    return `You are the virtual leasing assistant for South Oak Apartments.

IMPORTANT: Follow the instructions in the knowledge base below.

${knowledgeContent}

CRITICAL - CONFIRMATION RESPONSE:
When you have collected all required info (name, phone, email, tour date), use this EXACT template for your confirmation (keep it short!):
"${confirmationTemplate}"

Replace {name}, {phone}, {email}, {tour_date} with the actual values. Do NOT add extra information after the confirmation.

ADDITIONAL RULES:
- Keep ALL responses to 2-3 sentences max
- Never make up information not in the knowledge base
- Stay fair housing compliant
- Don't use markdown formatting`;
  }

  // Fallback
  return `You are the virtual leasing assistant for South Oak Apartments at 104 S Oak St, Spokane, WA 99201.

## GOALS
1. Answer questions briefly (2-3 sentences)
2. Collect: name, phone, email, tour date
3. When all info collected, respond with ONLY: "${confirmationTemplate}"

## PROPERTY
- 2 bed/1 bath - $1,200/month
- Available now, pet friendly
- Browne's Addition

Keep responses SHORT.`;
}

function extractLeadInfo(messages) {
  const userText = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ');
  const leadInfo = {};

  // Extract name - multiple patterns
  const namePatterns = [
    /(?:I'm|I am|my name is|this is|call me|it's|its)\s+([A-Z][a-z]+)/i,
    /^([A-Z][a-z]+)$/m,
    /name[:\s]+([A-Z][a-z]+)/i
  ];
  for (const pattern of namePatterns) {
    const match = userText.match(pattern);
    if (match) {
      leadInfo.first_name = match[1];
      break;
    }
  }

  // Extract phone number
  const phoneMatch = userText.match(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})\b/);
  if (phoneMatch) leadInfo.phone = phoneMatch[1].replace(/[-.\s]/g, '');

  // Extract email
  const emailMatch = userText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) leadInfo.email = emailMatch[1].toLowerCase();

  // Extract tour date/time - more patterns
  const tourPatterns = [
    /(?:tour|come|visit|see it|showing|schedule).*?(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|\d{1,2}\/\d{1,2})/i,
    /(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|morning|afternoon|noon|evening))?/i
  ];
  for (const pattern of tourPatterns) {
    const match = userText.match(pattern);
    if (match) {
      leadInfo.tour_date = match[1];
      if (match[2]) leadInfo.tour_time = match[2];
      break;
    }
  }

  return Object.keys(leadInfo).length > 0 ? leadInfo : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Get or create session
    let session = sessions.get(sessionId) || {
      id: sessionId || crypto.randomUUID(),
      messages: [],
      leadId: null,
      collectedInfo: {},
      leadSentToLeasingVoice: false
    };
    if (!sessions.has(session.id)) sessions.set(session.id, session);

    session.messages.push({ role: 'user', content: message });

    // Extract lead info from this message
    const newLeadInfo = extractLeadInfo([{ role: 'user', content: message }]);
    if (newLeadInfo) {
      session.collectedInfo = { ...session.collectedInfo, ...newLeadInfo };
    }

    // Get AI config for confirmation template
    const { data: aiConfig } = await supabase.from('ai_config').select('*').single();

    const systemPrompt = await buildSystemPrompt(aiConfig);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200, // Reduced to encourage shorter responses
      system: systemPrompt,
      messages: session.messages,
    });

    const assistantMessage = response.content[0].text;
    session.messages.push({ role: 'assistant', content: assistantMessage });

    // Check if we have minimum required info (firstName + phone)
    const info = session.collectedInfo;
    const hasMinimumInfo = info.first_name && info.phone;

    // Save to Supabase
    if (hasMinimumInfo && !session.leadId) {
      const { data: lead } = await supabase.from('leads').insert([{
        first_name: info.first_name,
        last_name: info.last_name || '',
        phone: info.phone,
        email: info.email || '',
        move_in_date: info.tour_date || '',
        chat_transcript: session.messages,
        source: 'website-chat',
        property_interest: 'South Oak Apartment',
      }]).select().single();
      if (lead) session.leadId = lead.id;
    } else if (session.leadId) {
      await supabase.from('leads').update({
        first_name: info.first_name,
        last_name: info.last_name || '',
        phone: info.phone,
        email: info.email || '',
        move_in_date: info.tour_date || '',
        chat_transcript: session.messages
      }).eq('id', session.leadId);
    }

    // Send to LeasingVoice when we have minimum info (only once)
    if (hasMinimumInfo && !session.leadSentToLeasingVoice) {
      console.log('Sending lead to LeasingVoice:', info);
      const result = await sendToLeadsAPI({
        first_name: info.first_name,
        last_name: info.last_name || '',
        phone: info.phone,
        email: info.email || '',
        tour_date: info.tour_date || '',
        tour_time: info.tour_time || ''
      });
      if (result?.success) {
        session.leadSentToLeasingVoice = true;
      }
    }

    res.json({ message: assistantMessage, sessionId: session.id });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}
