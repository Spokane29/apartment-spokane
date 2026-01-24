import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Database-backed session storage for serverless
async function getSession(sessionId) {
  if (!sessionId) return null;
  const { data } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  return data;
}

async function saveSession(session) {
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('session_id', session.session_id)
    .single();

  const payload = {
    session_id: session.session_id,
    message_count: session.message_count || 0,
    user_message_count: session.user_message_count || 0,
    lead_captured: session.lead_captured || false,
    lead_id: session.lead_id || null,
    tour_booked: session.tour_booked || false,
    collected_name: session.collected_name || false,
    collected_phone: session.collected_phone || false,
    collected_email: session.collected_email || false,
    collected_tour_date: session.collected_tour_date || false,
    collected_info: session.collected_info || {},
    messages: session.messages || [],
    lead_sent_to_leasingvoice: session.lead_sent_to_leasingvoice || false,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    await supabase.from('chat_sessions').update(payload).eq('session_id', session.session_id);
  } else {
    await supabase.from('chat_sessions').insert([payload]);
  }
}

// Convert relative date to YYYY-MM-DD format
function formatDate(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  const lower = dateStr.toLowerCase();

  if (lower === 'today') {
    return today.toISOString().split('T')[0];
  }
  if (lower === 'tomorrow') {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = days.indexOf(lower);
  if (dayIndex !== -1) {
    const currentDay = today.getDay();
    let daysUntil = dayIndex - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    today.setDate(today.getDate() + daysUntil);
    return today.toISOString().split('T')[0];
  }

  // If it's already a date format like 1/25, convert to full date
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }

  return dateStr;
}

// Convert time to readable format like "2:00 PM"
function formatTime(timeStr) {
  if (!timeStr) return null;
  const lower = timeStr.toLowerCase();

  if (lower === 'morning') return 'Morning';
  if (lower === 'afternoon') return 'Afternoon';
  if (lower === 'noon') return '12:00 PM';
  if (lower === 'evening') return 'Evening';

  // Parse times like "2pm", "2:30pm", "14:00"
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (match) {
    let hour = parseInt(match[1]);
    const minutes = match[2] || '00';
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;

    const h = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const m = meridiem || (hour >= 12 ? 'PM' : 'AM');
    return `${h}:${minutes} ${m.toUpperCase()}`;
  }

  return timeStr;
}

// Send lead to LeasingVoice API
async function sendToLeadsAPI(leadData) {
  const apiUrl = 'https://www.leasingvoice.com/api/leads/external';

  const payload = {
    firstName: leadData.first_name || '',
    lastName: leadData.last_name || '',
    phone: leadData.phone || '',
    email: leadData.email || '',
    propertyInterest: 'South Oak Apartment',
    source: 'south-oak-website',
    companyId: '322039f9-b67b-4084-b806-387ba26c4810',
    message: 'Interested via website chat'
  };

  // Add tour date/time as preferred fields for automatic tour creation
  if (leadData.tour_date) {
    payload.preferredDate = formatDate(leadData.tour_date);
  }
  if (leadData.tour_time) {
    payload.preferredTime = formatTime(leadData.tour_time);
  }

  try {
    console.log('Sending lead to LeasingVoice:', apiUrl, payload.firstName, payload.phone);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log('LeasingVoice response:', response.status, text);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    return { success: response.ok, status: response.status, data: result };
  } catch (error) {
    console.error('LeasingVoice API error:', error.message);
    return { success: false, error: error.message };
  }
}

async function buildSystemPrompt(aiConfig, collectedInfo = {}) {
  const { data: knowledgeBase } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('category', { ascending: true });

  // Get confirmation template (stored separately or use default)
  const templateEntry = (knowledgeBase || []).find(e => e.category === 'template');
  const confirmationTemplate = templateEntry?.content ||
    "Thanks {name}! Here's what I have: Phone: {phone}, Email: {email}, Tour: {tour_date} at {tour_time}. You'll receive a confirmation shortly. See you then!";

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

CRITICAL - TOUR SCHEDULING:
1. When someone gives a DATE without a TIME (e.g., "tomorrow", "Saturday"), ALWAYS ask: "What time works best for you - morning or afternoon?"
2. Only give confirmation AFTER you have: name, phone, email, tour date AND tour time

CONFIRMATION RESPONSE (use ONLY after collecting ALL info including time):
"${confirmationTemplate}"

Replace {name}, {phone}, {email}, {tour_date}, {tour_time} with actual values. Do NOT add extra text after confirmation.

ALREADY COLLECTED (do NOT ask for these again):
${collectedInfo.first_name ? `- Name: ${collectedInfo.first_name}` : '- Name: NOT YET'}
${collectedInfo.phone ? `- Phone: ${collectedInfo.phone}` : '- Phone: NOT YET'}
${collectedInfo.email ? `- Email: ${collectedInfo.email}` : '- Email: NOT YET'}
${collectedInfo.tour_date ? `- Tour Date: ${collectedInfo.tour_date}` : '- Tour Date: NOT YET'}
${collectedInfo.tour_time ? `- Tour Time: ${collectedInfo.tour_time}` : '- Tour Time: NOT YET'}

ADDITIONAL RULES:
- Keep ALL responses to 2-3 sentences max
- Never make up information not in the knowledge base
- Stay fair housing compliant
- Don't use markdown formatting
- NEVER ask for info already collected above`;
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

ALREADY COLLECTED (do NOT ask again):
${collectedInfo.first_name ? `- Name: ${collectedInfo.first_name}` : '- Name: NOT YET'}
${collectedInfo.phone ? `- Phone: ${collectedInfo.phone}` : '- Phone: NOT YET'}
${collectedInfo.email ? `- Email: ${collectedInfo.email}` : '- Email: NOT YET'}
${collectedInfo.tour_date ? `- Tour Date: ${collectedInfo.tour_date}` : '- Tour Date: NOT YET'}
${collectedInfo.tour_time ? `- Tour Time: ${collectedInfo.tour_time}` : '- Tour Time: NOT YET'}

Keep responses SHORT. NEVER ask for info already collected.`;
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

  // Extract tour date
  const datePattern = /(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|\d{1,2}\/\d{1,2})/i;
  const dateMatch = userText.match(datePattern);
  if (dateMatch) {
    leadInfo.tour_date = dateMatch[1];
  }

  // Extract tour time separately
  const timePattern = /(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)|morning|afternoon|noon|evening)/i;
  const timeMatch = userText.match(timePattern);
  if (timeMatch) {
    leadInfo.tour_time = timeMatch[1];
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

    // Get or create session from database
    const currentSessionId = sessionId || crypto.randomUUID();
    let dbSession = await getSession(currentSessionId);

    let session = {
      session_id: currentSessionId,
      messages: dbSession?.messages || [],
      lead_id: dbSession?.lead_id || null,
      collected_info: dbSession?.collected_info || {},
      lead_sent_to_leasingvoice: dbSession?.lead_sent_to_leasingvoice || false,
      message_count: dbSession?.message_count || 0,
      user_message_count: dbSession?.user_message_count || 0,
      lead_captured: dbSession?.lead_captured || false,
      tour_booked: dbSession?.tour_booked || false,
      collected_name: dbSession?.collected_name || false,
      collected_phone: dbSession?.collected_phone || false,
      collected_email: dbSession?.collected_email || false,
      collected_tour_date: dbSession?.collected_tour_date || false
    };

    // Track message counts
    session.message_count = (session.message_count || 0) + 1;
    session.user_message_count = (session.user_message_count || 0) + 1;

    session.messages.push({ role: 'user', content: message });

    // Extract lead info from this message
    const newLeadInfo = extractLeadInfo([{ role: 'user', content: message }]);
    if (newLeadInfo) {
      session.collected_info = { ...session.collected_info, ...newLeadInfo };
    }

    // Get AI config for confirmation template
    const { data: aiConfig } = await supabase.from('ai_config').select('*').single();

    const systemPrompt = await buildSystemPrompt(aiConfig, session.collected_info);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200, // Reduced to encourage shorter responses
      system: systemPrompt,
      messages: session.messages,
    });

    const assistantMessage = response.content[0].text;
    session.messages.push({ role: 'assistant', content: assistantMessage });

    // Check if we have minimum required info (firstName + phone)
    const info = session.collected_info;
    const hasMinimumInfo = info.first_name && info.phone;

    // Save lead to Supabase
    if (hasMinimumInfo && !session.lead_id) {
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
      if (lead) session.lead_id = lead.id;
    } else if (session.lead_id) {
      await supabase.from('leads').update({
        first_name: info.first_name,
        last_name: info.last_name || '',
        phone: info.phone,
        email: info.email || '',
        move_in_date: info.tour_date || '',
        chat_transcript: session.messages
      }).eq('id', session.lead_id);
    }

    // Also send to LeasingVoice API (only once per session)
    if (hasMinimumInfo && !session.lead_sent_to_leasingvoice) {
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
        session.lead_sent_to_leasingvoice = true;
        // Update local lead with LeasingVoice ID if returned
        if (result.data?.leadId && session.lead_id) {
          await supabase.from('leads').update({
            leasingvoice_id: result.data.leadId
          }).eq('id', session.lead_id);
        }
      }
    }

    // Update session tracking flags
    session.lead_captured = hasMinimumInfo;
    session.tour_booked = !!(info.tour_date) && hasMinimumInfo;
    session.collected_name = !!info.first_name;
    session.collected_phone = !!info.phone;
    session.collected_email = !!info.email;
    session.collected_tour_date = !!info.tour_date;
    session.message_count = session.message_count + 1; // +1 for assistant response

    // Save session to database
    await saveSession(session);

    res.json({ message: assistantMessage, sessionId: session.session_id });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}
