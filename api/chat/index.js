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

async function buildSystemPrompt(aiConfig, collectedInfo = {}, messageCount = 0, lastUserMessage = '') {
  const { data: knowledgeBase } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('category', { ascending: true });

  // Get confirmation template (stored separately or use default)
  const templateEntry = (knowledgeBase || []).find(e => e.category === 'template');
  const confirmationTemplate = templateEntry?.content ||
    "Thanks {name}. Here's what I have: Phone: {phone}, Email: {email}, Tour: {tour_date} at {tour_time}. You'll receive a confirmation shortly. See you then.";

  // Get custom AI rules from database
  const rulesEntry = (knowledgeBase || []).find(e => e.category === 'rules');
  const customRules = rulesEntry?.content || '';

  // Combine all knowledge base entries (excluding template) into one document
  const knowledgeContent = (knowledgeBase || [])
    .filter(e => e.category !== 'template')
    .map((entry) => entry.content)
    .join('\n\n');

  // Determine conversation state
  const hasTourDate = !!collectedInfo.tour_date;
  const hasTourTime = !!collectedInfo.tour_time;
  const hasName = !!collectedInfo.first_name;
  const hasPhone = !!collectedInfo.phone;
  const hasEmail = !!collectedInfo.email;

  let conversationState = 'GREETING';
  let nextAction = 'Answer questions or offer to schedule a tour';

  if (hasTourDate || hasTourTime) {
    conversationState = 'SCHEDULING_TOUR';
    if (!hasTourTime) {
      nextAction = 'Ask what TIME works for their tour';
    } else if (!hasName) {
      nextAction = 'Ask for their NAME to complete booking';
    } else if (!hasPhone) {
      nextAction = 'Ask for their PHONE NUMBER';
    } else if (!hasEmail) {
      nextAction = 'Ask for their EMAIL';
    } else {
      nextAction = 'Give the confirmation message - all info collected';
    }
  } else if (hasName) {
    conversationState = 'COLLECTING_INFO';
    nextAction = 'Continue collecting info - they may want to book';
  }

  // If we have substantial knowledge base content, use it as the primary instruction set
  if (knowledgeContent && knowledgeContent.trim().length > 100) {
    return `You are the virtual leasing assistant for South Oak Apartments.

=== CONVERSATION STATE: ${conversationState} ===
Message count: ${messageCount} (this is NOT a new conversation if > 0)
YOUR NEXT ACTION: ${nextAction}

PROPERTY KNOWLEDGE:
${knowledgeContent}

=== ALREADY COLLECTED INFO (NEVER ask for these again) ===
${hasName ? `✓ Name: ${collectedInfo.first_name}${collectedInfo.last_name ? ' ' + collectedInfo.last_name : ''}` : '○ Name: NOT YET COLLECTED'}
${hasPhone ? `✓ Phone: ${collectedInfo.phone}` : '○ Phone: NOT YET COLLECTED'}
${hasEmail ? `✓ Email: ${collectedInfo.email}` : '○ Email: NOT YET COLLECTED'}
${hasTourDate ? `✓ Tour Date: ${collectedInfo.tour_date}` : '○ Tour Date: NOT YET COLLECTED'}
${hasTourTime ? `✓ Tour Time: ${collectedInfo.tour_time}` : '○ Tour Time: NOT YET COLLECTED'}

=== TOUR SCHEDULING FLOW ===
Order: 1) Tour Date → 2) Tour Time → 3) Name → 4) Phone → 5) Email → 6) Confirmation
- When user gives DATE without TIME: Ask "What time works best?"
- When user gives DATE AND TIME together: Ask for name
- When user gives NAME: Say "Thanks [name]." then ask for phone
- When user gives PHONE: Ask for email
- When ALL 5 items collected (all marked ✓ above): Give confirmation ONLY, do NOT ask any more questions

${(hasTourDate && hasTourTime && hasName && hasPhone && hasEmail) ? `
*** ALL INFO COLLECTED - GIVE CONFIRMATION NOW ***
Do NOT ask any more questions. Just confirm the booking:
` : ''}
CONFIRMATION TEMPLATE:
"${confirmationTemplate}"

=== LAST USER MESSAGE ===
"${lastUserMessage}"
(Respond to THIS message. Do NOT restart the conversation.)

=== CRITICAL: NEVER DO THESE (instant failure) ===
- NEVER say "Hi there", "Hello", "Hi!" - THIS IS MID-CONVERSATION
- NEVER say "What would you like to know" or "How can I help"
- NEVER ask for info already marked with ✓ above
- NEVER use exclamation points

=== IF INPUT IS UNCLEAR OR INVALID ===
- Ask them to clarify or re-enter
- For incomplete emails (like "@gmail.com" or "at gmail.com"): say "Could you please type your full email in the text box below? Voice sometimes misses part of it."
- Do NOT restart the conversation
- Do NOT say "Hi" or greet them again
- Stay in the current flow

=== RULES ===
1. Max 2 sentences per response
2. No exclamation points ever
3. When booking tour: collect date → time → name → phone → email → confirm
4. If user gives invalid input, ask them to try again - don't restart
5. Stay on task - keep collecting info until tour is booked
${customRules ? `\nCUSTOM RULES:\n${customRules}` : ''}`;
  }

  // Fallback
  return `You are the virtual leasing assistant for South Oak Apartments at 104 S Oak St, Spokane, WA 99201.

=== CONVERSATION STATE: ${conversationState} ===
Message count: ${messageCount} (this is NOT a new conversation if > 0)
YOUR NEXT ACTION: ${nextAction}

## PROPERTY
- 2 bed/1 bath - $1,200/month
- Available now, pet friendly
- Browne's Addition

=== ALREADY COLLECTED (NEVER ask again) ===
${hasName ? `✓ Name: ${collectedInfo.first_name}` : '○ Name: NOT YET'}
${hasPhone ? `✓ Phone: ${collectedInfo.phone}` : '○ Phone: NOT YET'}
${hasEmail ? `✓ Email: ${collectedInfo.email}` : '○ Email: NOT YET'}
${hasTourDate ? `✓ Tour Date: ${collectedInfo.tour_date}` : '○ Tour Date: NOT YET'}
${hasTourTime ? `✓ Tour Time: ${collectedInfo.tour_time}` : '○ Tour Time: NOT YET'}

=== LAST USER MESSAGE ===
"${lastUserMessage}"
(Respond to THIS. Do NOT restart conversation.)

=== CRITICAL: NEVER DO THESE ===
- NEVER say "Hi there", "Hello", "Hi!"
- NEVER say "What would you like to know"
- NEVER use exclamation points

=== RULES ===
1. Max 2 sentences. No exclamation points.
2. If input unclear, ask to clarify - don't restart
3. Order: tour date → time → name → phone → email → confirm
${customRules ? `\nCUSTOM RULES:\n${customRules}` : ''}`;
}

function extractLeadInfo(messages) {
  const userText = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ');
  const leadInfo = {};

  // Check if this message contains a real email - if so, don't try to extract name
  // (prevents extracting "mccoy" from "mccoy@gmail.com" as a name)
  // But don't match date@time like "tonight@7:00"
  const containsEmail = /@(gmail|yahoo|hotmail|outlook|icloud|aol|mail|email)/i.test(userText);

  // Extract name - multiple patterns (but NOT if message contains email)
  if (!containsEmail) {
    const namePatterns = [
      /(?:I'm|I am|my name is|this is|call me|it's|its)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)$/im,
      /name[:\s]+([A-Z][a-z]+)/i,
      // Catch simple two-word names like "Joe Schmoe" or "joe schmoe"
      /^([A-Z]?[a-z]+\s+[A-Z]?[a-z]+)$/im
    ];
    for (const pattern of namePatterns) {
      const match = userText.match(pattern);
      if (match) {
        // Capitalize first letter of each word
        const name = match[1].split(' ')[0];
        leadInfo.first_name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        // Also capture last name if present
        const parts = match[1].split(' ');
        if (parts.length > 1) {
          leadInfo.last_name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
        }
        break;
      }
    }
  }

  // Extract phone number
  const phoneMatch = userText.match(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})\b/);
  if (phoneMatch) leadInfo.phone = phoneMatch[1].replace(/[-.\s]/g, '');

  // Extract email - be more permissive
  const emailMatch = userText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    leadInfo.email = emailMatch[1].toLowerCase();
  } else {
    // Also try to match something that looks like an email attempt (like "test at gmail.com" or just contains @)
    const looseEmailMatch = userText.match(/([a-zA-Z0-9._%+-]+\s*(?:@|at)\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (looseEmailMatch) {
      leadInfo.email = looseEmailMatch[1].replace(/\s*at\s*/i, '@').toLowerCase();
    }
  }

  // Extract tour date - include "tonight" and "this evening"
  const datePattern = /(tonight|tomorrow|today|this evening|this afternoon|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|\d{1,2}\/\d{1,2})/i;
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

// Preprocess voice input to handle spoken emails, phone numbers, and date/time
function preprocessVoiceInput(text) {
  let result = text;

  // FIRST: Fix date@time format (e.g., "tonight@7:00" → "tonight at 7:00")
  // This must happen BEFORE email processing
  result = result.replace(/(tonight|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)@(\d)/gi, '$1 at $2');

  // Convert spoken emails: "joe at gmail dot com" → "joe@gmail.com"
  // But NOT for time expressions like "today at 7"
  result = result.replace(/(\w+)\s+at\s+(gmail|yahoo|hotmail|outlook|icloud)/gi, '$1@$2');
  result = result.replace(/\s+dot\s+/gi, '.');

  // Common voice misheards for email
  result = result.replace(/\bgmail\b/gi, 'gmail');
  result = result.replace(/\byahoo\b/gi, 'yahoo');
  result = result.replace(/\boutlook\b/gi, 'outlook');
  result = result.replace(/\bhotmail\b/gi, 'hotmail');

  // Remove spaces around @ and . in email-like strings (but not in date/time)
  result = result.replace(/(\w)@(\w)/g, '$1@$2');
  result = result.replace(/(\w)\s*\.\s*(com|org|net|edu|io)/gi, '$1.$2');

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Preprocess message for voice input
    message = preprocessVoiceInput(message);

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
    // IMPORTANT: Don't overwrite already-collected info
    const newLeadInfo = extractLeadInfo([{ role: 'user', content: message }]);
    if (newLeadInfo) {
      // Only add NEW fields, never overwrite existing ones
      for (const [key, value] of Object.entries(newLeadInfo)) {
        if (!session.collected_info[key]) {
          session.collected_info[key] = value;
        }
      }
    }

    // Get AI config for confirmation template
    const { data: aiConfig } = await supabase.from('ai_config').select('*').single();

    const systemPrompt = await buildSystemPrompt(aiConfig, session.collected_info, session.message_count, message);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100, // Keep responses very short
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

    // Save session to database (don't fail request if this errors)
    try {
      await saveSession(session);
    } catch (saveErr) {
      console.error('Session save error (non-fatal):', saveErr.message);
    }

    res.json({ message: assistantMessage, sessionId: session.session_id });
  } catch (error) {
    console.error('Chat error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to process message', details: error.message });
  }
}
