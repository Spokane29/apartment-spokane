const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { getKnowledgeBase, getAIConfig } = require('./supabase');

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

// Build the system prompt with knowledge base and AI config
async function buildSystemPrompt() {
  const [knowledgeBase, aiConfig] = await Promise.all([getKnowledgeBase(), getAIConfig()]);

  const assistantName = aiConfig?.assistant_name || 'Sona';
  const personalityRules = aiConfig?.personality_rules || 'Friendly and conversational. Answer questions directly. Ask one question at a time. Never be pushy.';

  // Format knowledge base content
  const knowledgeContent = knowledgeBase
    .map((entry) => `## ${entry.title}\n${entry.content}`)
    .join('\n\n');

  return `You are ${assistantName}, the virtual leasing assistant for South Oak Apartments at 104 S Oak St, Spokane, WA 99204 in the Browne's Addition neighborhood.

## YOUR PERSONALITY
${personalityRules}

## COMMUNICATION STYLE
- Answer questions directly without overwhelming with info
- Ask ONE question at a time when gathering info
- Keep responses concise (2-3 sentences typical)
- Use natural conversation flow, not scripted responses
- Be like a knowledgeable neighbor, not a salesperson
- Never be pushy or salesy

## YOUR GOALS (in priority order)
1. Answer the prospect's immediate question first
2. Naturally learn what they're looking for
3. Collect contact info through conversation (NOT a form dump)
4. Offer to schedule a tour when timing is right

## INFORMATION TO COLLECT NATURALLY
- First name (required) - "What's your name?" or "Who am I chatting with?"
- Phone number (required) - "What's the best number to reach you?"
- Email (encouraged) - "And your email for confirmation?"
- Move-in timeframe (required) - "When are you looking to move?"
- What brought them here (required) - "What caught your eye about South Oak?"

## TOUR SCHEDULING
- The property manager is Steve
- Offer available tour times naturally
- Confirm day/time preference
- Collect contact info if not already gathered
- Mention they'll meet Steve (the manager)

## BOUNDARIES - FOLLOW STRICTLY
DO:
- Answer questions from the knowledge base below
- Be helpful and friendly
- Offer to have Steve follow up for complex questions
- Stay fair housing compliant at all times

DO NOT:
- Make up information not in the knowledge base
- Discuss other tenants or occupancy details
- Negotiate pricing or offer deals
- Use discriminatory language (familial status, race, religion, disability, national origin, sex, etc.)
- Be pushy about tours or contact info
- Ask multiple questions at once
- Provide specific legal or financial advice

## KNOWLEDGE BASE
${knowledgeContent || 'Property information is being updated. For specific details, offer to have Steve contact them.'}

## RESPONSE FORMAT
- Keep responses short and conversational
- Use line breaks for readability when needed
- Don't use markdown formatting (no **, ##, etc.)
- Write naturally as if texting`;
}

// Process a chat message
async function chat(messages, sessionId) {
  const systemPrompt = await buildSystemPrompt();

  // Format messages for Claude API
  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    messages: formattedMessages,
  });

  const assistantMessage = response.content[0].text;

  // Extract any lead information from the conversation
  const leadInfo = extractLeadInfo(messages, assistantMessage);

  return {
    message: assistantMessage,
    leadInfo,
    sessionId,
  };
}

// Extract lead information from conversation
function extractLeadInfo(messages, latestResponse) {
  const allText = messages.map((m) => m.content).join(' ') + ' ' + latestResponse;
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const allUserText = userMessages.join(' ');

  const leadInfo = {};

  // Extract name - look for common patterns
  const namePatterns = [
    /(?:I'm|I am|my name is|this is|call me)\s+([A-Z][a-z]+)/i,
    /^([A-Z][a-z]+)$/m, // Single capitalized word as response to "what's your name"
  ];
  for (const pattern of namePatterns) {
    const match = allUserText.match(pattern);
    if (match) {
      leadInfo.first_name = match[1];
      break;
    }
  }

  // Extract phone number
  const phonePattern = /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4})\b/;
  const phoneMatch = allUserText.match(phonePattern);
  if (phoneMatch) {
    leadInfo.phone = phoneMatch[1].replace(/[-.\s()]/g, '');
  }

  // Extract email
  const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;
  const emailMatch = allUserText.match(emailPattern);
  if (emailMatch) {
    leadInfo.email = emailMatch[1].toLowerCase();
  }

  // Extract move-in timeframe
  const moveInPatterns = [
    /(?:move|moving|looking to move|need.+by|move.?in)\s*(?:in|by|around)?\s*(next month|this month|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|\d+ (?:weeks?|months?|days?))/i,
    /(asap|immediately|as soon as possible|right away)/i,
  ];
  for (const pattern of moveInPatterns) {
    const match = allUserText.match(pattern);
    if (match) {
      leadInfo.move_in_date = match[1];
      break;
    }
  }

  return Object.keys(leadInfo).length > 0 ? leadInfo : null;
}

// Get greeting message
async function getGreeting() {
  const aiConfig = await getAIConfig();
  return aiConfig?.greeting_message || "Hi! I'm Sona, the virtual assistant for South Oak Apartments. How can I help you today?";
}

module.exports = {
  chat,
  getGreeting,
  extractLeadInfo,
};
