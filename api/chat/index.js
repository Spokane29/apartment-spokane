import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Database-backed session storage for serverless
async function getSession(sessionId) {
  if (!sessionId) return null;
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('getSession error:', error.message);
    return null;
  }

  if (data) {
    console.log('Loaded session:', sessionId, 'collected_info:', JSON.stringify(data.collected_info));
  } else {
    console.log('No existing session found for:', sessionId);
  }

  return data;
}

async function saveSession(session) {
  // Use maybeSingle to avoid throwing when no record found
  const { data: existing, error: selectError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('session_id', session.session_id)
    .maybeSingle();

  if (selectError) {
    console.error('Session select error:', selectError.message);
  }

  // Ensure all boolean fields are explicitly boolean (not truthy strings)
  const payload = {
    session_id: session.session_id,
    message_count: session.message_count || 0,
    user_message_count: session.user_message_count || 0,
    lead_captured: Boolean(session.lead_captured),
    lead_id: session.lead_id || null,
    tour_booked: Boolean(session.tour_booked),
    collected_name: Boolean(session.collected_name),
    collected_phone: Boolean(session.collected_phone),
    collected_email: Boolean(session.collected_email),
    collected_tour_date: Boolean(session.collected_tour_date),
    collected_info: session.collected_info || {},
    messages: session.messages || [],
    lead_sent_to_leasingvoice: Boolean(session.lead_sent_to_leasingvoice),
    updated_at: new Date().toISOString()
  };

  console.log('Saving session:', session.session_id);

  if (existing) {
    const { error: updateError } = await supabase.from('chat_sessions').update(payload).eq('session_id', session.session_id);
    if (updateError) {
      console.error('Session update error:', updateError.message);
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase.from('chat_sessions').insert([payload]);
    if (insertError) {
      console.error('Session insert error:', insertError.message);
      throw insertError;
    }
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
  // Debug: log what we receive
  console.log('buildSystemPrompt received collectedInfo:', JSON.stringify(collectedInfo));

  // Only fetch the 'complete' category - this is what the admin panel edits
  const { data: knowledgeBase } = await supabase
    .from('knowledge_base')
    .select('*')
    .in('category', ['complete', 'template', 'rules']);

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
  const hasMoveInDate = !!collectedInfo.move_in_date;

  let conversationState = 'GREETING';
  let nextAction = 'Answer questions or offer to schedule a tour';

  if (hasTourDate || hasTourTime) {
    conversationState = 'SCHEDULING_TOUR';
    if (!hasMoveInDate) {
      nextAction = 'Ask "When are you planning to move?"';
    } else if (!hasTourTime) {
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
    // Build collected info status
    const collectedStatus = [];
    if (hasName) collectedStatus.push(`Name: ${collectedInfo.first_name}${collectedInfo.last_name ? ' ' + collectedInfo.last_name : ''}`);
    if (hasPhone) collectedStatus.push(`Phone: ${collectedInfo.phone}`);
    if (hasEmail) collectedStatus.push(`Email: ${collectedInfo.email}`);
    if (hasTourDate) collectedStatus.push(`Tour Date: ${collectedInfo.tour_date}`);
    if (hasTourTime) collectedStatus.push(`Tour Time: ${collectedInfo.tour_time}`);
    if (hasMoveInDate) collectedStatus.push(`Move-in Date: ${collectedInfo.move_in_date}`);

    // All collected - ready for confirmation
    const allCollected = hasTourDate && hasTourTime && hasName && hasPhone && hasEmail && hasMoveInDate;

    return `You are a leasing assistant for South Oak Apartments.

PROPERTY INFO:
${knowledgeContent}

##########################################################
# CRITICAL - READ THIS BEFORE RESPONDING
##########################################################

ALREADY COLLECTED (I HAVE THIS - DO NOT ASK):
${hasName ? `- Name: ${collectedInfo.first_name} ✓ HAVE IT` : ''}
${hasPhone ? `- Phone: ${collectedInfo.phone} ✓ HAVE IT` : ''}
${hasEmail ? `- Email: ${collectedInfo.email} ✓ HAVE IT` : ''}
${hasTourDate ? `- Tour Date: ${collectedInfo.tour_date} ✓ HAVE IT` : ''}
${hasTourTime ? `- Tour Time: ${collectedInfo.tour_time} ✓ HAVE IT` : ''}
${hasMoveInDate ? `- Move-in Date: ${collectedInfo.move_in_date} ✓ HAVE IT` : ''}

STILL NEED TO COLLECT:
${!hasTourDate ? '- Tour Date' : ''}
${!hasMoveInDate && hasTourDate ? '- Move-in Date (ask "When are you planning to move?")' : ''}
${!hasTourTime && hasMoveInDate ? '- Tour Time' : ''}
${!hasName && hasTourTime ? '- Name (ask for this next)' : ''}
${!hasPhone && hasName ? '- Phone (ask for this next)' : ''}
${!hasEmail && hasPhone ? '- Email (ask for this next)' : ''}

${allCollected ? `
*** ALL INFO COLLECTED - GIVE CONFIRMATION NOW ***
Use this template: "${confirmationTemplate}"
` : `
YOUR SINGLE TASK: ${nextAction}
`}

##########################################################
# ABSOLUTE RULES - VIOLATION = FAILURE
##########################################################

${hasTourTime ? `TOUR TIME IS ALREADY COLLECTED (${collectedInfo.tour_time}).
DO NOT ask for time. DO NOT ask "what time". The tour time is already set.` : ''}

${hasPhone ? `PHONE IS ALREADY COLLECTED (${collectedInfo.phone}).
DO NOT ask for phone. DO NOT mention needing phone. DO NOT say "I need your phone".
The phone number ${collectedInfo.phone} is already saved.` : ''}

${hasEmail ? `EMAIL IS ALREADY COLLECTED (${collectedInfo.email}).
DO NOT ask for email again.` : ''}

- Message count: ${messageCount}. ${messageCount > 0 ? 'Mid-conversation - NO greetings, NO "Hi", NO "Hello"' : ''}
- Max 2 sentences
- No exclamation points
- Accept any email with @ symbol (like user@gmail.com)
- If user declines, skips, or doesn't answer a question, MOVE ON to the next question. Don't push.
- We only need phone OR email to complete - not both required.

Last user message: "${lastUserMessage}"
${customRules ? `\nCustom rules:\n${customRules}` : ''}`;
  }

  // Fallback - same structure as main prompt
  const allCollectedFallback = hasTourDate && hasTourTime && hasName && hasPhone && hasEmail;

  return `You are a leasing assistant for South Oak Apartments (104 S Oak St, Spokane WA).

PROPERTY: 2 bed/1 bath, $1,200/mo, available now, pet friendly.

##########################################################
# CRITICAL - READ THIS BEFORE RESPONDING
##########################################################

ALREADY COLLECTED (DO NOT ASK FOR THESE):
${hasName ? `- Name: ${collectedInfo.first_name} ✓ HAVE IT` : ''}
${hasPhone ? `- Phone: ${collectedInfo.phone} ✓ HAVE IT` : ''}
${hasEmail ? `- Email: ${collectedInfo.email} ✓ HAVE IT` : ''}
${hasTourDate ? `- Tour Date: ${collectedInfo.tour_date} ✓ HAVE IT` : ''}
${hasTourTime ? `- Tour Time: ${collectedInfo.tour_time} ✓ HAVE IT` : ''}

${allCollectedFallback ? `
*** ALL INFO COLLECTED - GIVE CONFIRMATION ***
` : `
YOUR TASK: ${nextAction}
`}

##########################################################
# ABSOLUTE RULES
##########################################################

${hasTourTime ? `TOUR TIME ALREADY COLLECTED: ${collectedInfo.tour_time}
DO NOT ask for time again.` : ''}

${hasPhone ? `PHONE ALREADY COLLECTED: ${collectedInfo.phone}
DO NOT ask for phone again. DO NOT say "I need your phone".` : ''}

${hasEmail ? `EMAIL ALREADY COLLECTED: ${collectedInfo.email}
DO NOT ask for email again.` : ''}

- Message count: ${messageCount}. ${messageCount > 0 ? 'NO greetings' : ''}
- Max 2 sentences, no exclamation points
- Accept any email with @ symbol
- If user declines or skips a question, MOVE ON to the next. Don't push.
- We only need phone OR email to complete - not both required.

Last message: "${lastUserMessage}"
${customRules ? `\nCustom rules:\n${customRules}` : ''}`;
}

function extractLeadInfo(messages) {
  const leadInfo = {};
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);

  // Common words that should NOT be extracted as names
  const notNames = ['interested', 'looking', 'wondering', 'calling', 'texting', 'asking', 'inquiring', 'here', 'ready', 'available', 'free', 'busy', 'good', 'great', 'fine', 'okay', 'sure', 'yes', 'no', 'maybe', 'the', 'this', 'that', 'what', 'when', 'where', 'how', 'why', 'who'];

  // Process each message individually for name extraction
  // Voice users often give name, email, and phone all in one message
  for (const msg of userMessages) {
    // Only try to extract name if we don't have one yet
    if (!leadInfo.first_name) {
      // ALWAYS try explicit "my name is" pattern first - this is unambiguous
      // Do this BEFORE checking for email presence
      // Use [a-z] with i flag to match both upper and lowercase (Deepgram often returns lowercase)
      const explicitNameMatch = msg.match(/(?:my name is|name is|call me|i'm|i am|this is)\s*,?\s*([a-z]+(?:\s+[a-z]+)?)/i);
      if (explicitNameMatch) {
        const name = explicitNameMatch[1].split(' ')[0];
        if (!notNames.includes(name.toLowerCase()) && name.length > 1) {
          leadInfo.first_name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
          const parts = explicitNameMatch[1].split(' ');
          if (parts.length > 1 && !notNames.includes(parts[1].toLowerCase()) && parts[1].length > 1) {
            leadInfo.last_name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
          }
          continue; // Found name, move to next message
        }
      }

      // For other patterns, skip if message contains an email (to avoid extracting email username as name)
      const msgContainsEmail = /@(gmail|yahoo|hotmail|outlook|icloud|aol|mail|email)/i.test(msg);
      if (!msgContainsEmail) {
        // Clean message - trim and remove trailing punctuation for matching
        const cleanMsg = msg.trim().replace(/[.,!?]+$/, '').trim();

        // Try other patterns for standalone name responses (case-insensitive for voice input)
        const namePatterns = [
          // Standalone name with optional punctuation: "Frank" or "Frank." or "frank smith"
          /^([a-z]+(?:\s+[a-z]+)?)\s*[.,!?]*$/im,
          // "name: Frank" or "name Frank"
          /name[:\s]+([a-z]+)/i,
          // "It's Frank" pattern
          /(?:it's|its)\s+([a-z]+)/i
        ];
        for (const pattern of namePatterns) {
          const match = cleanMsg.match(pattern);
          if (match) {
            const name = match[1].split(' ')[0];
            // Skip if it's a common word, not a name, or too short
            if (notNames.includes(name.toLowerCase()) || name.length < 2) continue;
            leadInfo.first_name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            const parts = match[1].split(' ');
            if (parts.length > 1 && !notNames.includes(parts[1].toLowerCase()) && parts[1].length > 1) {
              leadInfo.last_name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
            }
            break;
          }
        }
      }
    }
  }

  // For other fields, join all messages (they don't have the same issue)
  const userText = userMessages.join(' ');

  // Extract phone number - handle formats like (818) 888-8816, 818-888-8816, 8188888816
  const phoneMatch = userText.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
  if (phoneMatch) leadInfo.phone = phoneMatch[1] + phoneMatch[2] + phoneMatch[3];

  // Extract email - be more permissive
  const emailMatch = userText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    leadInfo.email = emailMatch[1].toLowerCase();
  } else {
    const looseEmailMatch = userText.match(/([a-zA-Z0-9._%+-]+\s*(?:@|at)\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (looseEmailMatch) {
      leadInfo.email = looseEmailMatch[1].replace(/\s*at\s*/i, '@').toLowerCase();
    }
  }

  // Extract tour date
  const datePattern = /(tonight|tomorrow|today|this evening|this afternoon|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|\d{1,2}\/\d{1,2})/i;
  const dateMatch = userText.match(datePattern);
  if (dateMatch) {
    leadInfo.tour_date = dateMatch[1];
  }

  // Extract tour time - handle various voice transcription formats
  const timePatterns = [
    // "at 2pm", "at 2:00pm", "at 2 pm"
    /at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i,
    // "2pm", "2:00pm", "2 pm" standalone
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))/i,
    // "morning", "afternoon", "noon", "evening"
    /\b(morning|afternoon|noon|evening)\b/i,
    // "2 o'clock", "two o'clock"
    /(\w+)\s*o'?\s*clock/i,
    // Standalone number after "at" like "at 2" (assume pm for business hours)
    /at\s+(\d{1,2})(?:\s|$|,)/i
  ];
  for (const pattern of timePatterns) {
    const match = userText.match(pattern);
    if (match) {
      leadInfo.tour_time = match[1];
      break;
    }
  }

  // Extract move-in date (different from tour date)
  const moveInPatterns = [
    /(?:move|moving|move-in|move in)(?:\s+in)?\s+(?:around|on|by|in)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /(?:looking to move|planning to move|want to move|need to move)\s+(?:in\s+)?(?:around|on|by|in)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|next month|next week|asap|immediately|soon|\d{1,2}\/\d{1,2})/i,
    /(?:move-in|move in|moving)\s+(?:date|time)?\s*(?:is|would be|:)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|next month|next week|asap|immediately|soon|end of \w+|beginning of \w+|\d{1,2}\/\d{1,2})/i,
    // Standalone month or timeframe (for direct answers like "February" or "ASAP")
    /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|next month|next week|asap|immediately|soon|end of \w+|beginning of \w+|a few weeks|couple weeks|couple of weeks|30 days|60 days|90 days)$/im
  ];
  for (const pattern of moveInPatterns) {
    const match = userText.match(pattern);
    if (match) {
      leadInfo.move_in_date = match[1];
      break;
    }
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
    console.log('=== CHAT API CALLED ===');
    console.log('Received:', { message: message?.substring(0, 50), sessionId });
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
    console.log('Extracted from message:', message, '→', JSON.stringify(newLeadInfo));
    console.log('Existing collected_info:', JSON.stringify(session.collected_info));

    if (newLeadInfo) {
      // Only add NEW fields, never overwrite existing ones
      for (const [key, value] of Object.entries(newLeadInfo)) {
        if (!session.collected_info[key]) {
          console.log('Adding new field:', key, '=', value);
          session.collected_info[key] = value;
        } else {
          console.log('Skipping existing field:', key, '(already have:', session.collected_info[key], ')');
        }
      }
    }
    console.log('Final collected_info:', JSON.stringify(session.collected_info));

    // Get AI config for confirmation template
    const { data: aiConfig } = await supabase.from('ai_config').select('*').single();

    const systemPrompt = await buildSystemPrompt(aiConfig, session.collected_info, session.message_count, message);

    // Debug log what we're sending to Claude
    console.log('Session state before AI call:', {
      sessionId: session.session_id,
      messageCount: session.message_count,
      collected: session.collected_info,
      hasName: !!session.collected_info.first_name,
      hasPhone: !!session.collected_info.phone,
      hasEmail: !!session.collected_info.email
    });
    // Log the system prompt to verify phone is marked as collected
    console.log('SYSTEM PROMPT SNIPPET:', systemPrompt.substring(0, 1500));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100, // Keep responses very short
      system: systemPrompt,
      messages: session.messages,
    });

    const assistantMessage = response.content[0].text;
    session.messages.push({ role: 'assistant', content: assistantMessage });

    // Check if we have minimum required info (phone OR email)
    const info = session.collected_info;
    const hasMinimumInfo = info.phone || info.email;

    // Save lead to Supabase
    if (hasMinimumInfo && !session.lead_id) {
      console.log('Saving NEW lead to Supabase:', info.first_name, info.phone);
      const { data: lead, error: insertError } = await supabase.from('leads').insert([{
        first_name: info.first_name,
        last_name: info.last_name || '',
        phone: info.phone,
        email: info.email || '',
        move_in_date: info.move_in_date || '',
        chat_transcript: session.messages,
        source: 'website-chat',
        property_interest: 'South Oak Apartment',
      }]).select().single();
      if (insertError) {
        console.error('Lead INSERT error:', insertError.message);
      } else if (lead) {
        console.log('Lead saved with ID:', lead.id);
        session.lead_id = lead.id;
      }
    } else if (session.lead_id) {
      console.log('Updating existing lead:', session.lead_id);
      const { error: updateError } = await supabase.from('leads').update({
        first_name: info.first_name,
        last_name: info.last_name || '',
        phone: info.phone,
        email: info.email || '',
        move_in_date: info.move_in_date || '',
        chat_transcript: session.messages
      }).eq('id', session.lead_id);
      if (updateError) {
        console.error('Lead UPDATE error:', updateError.message);
      }
    }

    // Send to LeasingVoice API - send once we have phone OR email
    // Don't require all fields - send partial leads too
    const hasContactInfo = info.phone || info.email;
    console.log('Lead status check:', {
      hasMinimumInfo,
      hasContactInfo,
      lead_sent_to_leasingvoice: session.lead_sent_to_leasingvoice,
      info
    });
    if (hasContactInfo && !session.lead_sent_to_leasingvoice) {
      console.log('Sending lead to LeasingVoice:', info);
      const result = await sendToLeadsAPI({
        first_name: info.first_name,
        last_name: info.last_name || '',
        phone: info.phone,
        email: info.email,
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
    let saveError = null;
    try {
      await saveSession(session);
    } catch (saveErr) {
      console.error('Session save error:', saveErr.message);
      saveError = saveErr.message;
    }

    res.json({ message: assistantMessage, sessionId: session.session_id });
  } catch (error) {
    console.error('Chat error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to process message', details: error.message });
  }
}
