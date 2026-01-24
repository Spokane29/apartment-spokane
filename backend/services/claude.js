const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { getKnowledgeBase, getAIConfig } = require('./supabase');

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

// Build the system prompt with knowledge base and AI config
async function buildSystemPrompt() {
  const [knowledgeBase, aiConfig] = await Promise.all([getKnowledgeBase(), getAIConfig()]);

  // Combine all knowledge base entries into one document
  const knowledgeContent = knowledgeBase
    .map((entry) => entry.content)
    .join('\n\n');

  // If we have substantial knowledge base content, use it as the primary instruction set
  if (knowledgeContent && knowledgeContent.trim().length > 100) {
    return `You are the virtual leasing assistant for South Oak Apartments.

IMPORTANT: Follow the instructions in the knowledge base below. The knowledge base defines your personality, goals, response style, and all property information.

${knowledgeContent}

ADDITIONAL RULES:
- Never make up information not in the knowledge base
- Stay fair housing compliant - never use discriminatory language
- Keep responses conversational and natural
- Don't use markdown formatting in responses`;
  }

  // Fallback if no knowledge base content
  const assistantName = aiConfig?.assistant_name || 'Sona';
  const personalityRules = aiConfig?.personality_rules || 'Friendly and conversational.';

  return `You are ${assistantName}, the virtual leasing assistant for South Oak Apartments at 104 S Oak St, Spokane, WA 99201 in Browne's Addition.

## YOUR PERSONALITY
${personalityRules}

## YOUR GOALS
1. Answer questions about the apartment briefly (2-3 sentences)
2. Guide conversations toward scheduling a tour
3. Collect contact info naturally: name, phone, email, preferred tour date

## PROPERTY BASICS
- 2 bedroom, 1 bath - $1,200/month
- Available now
- Pet friendly, no pet deposit
- Browne's Addition neighborhood

## RESPONSE STYLE
- Keep responses to 2-3 sentences
- After answering a question, suggest a tour
- Be friendly and conversational

## BOUNDARIES
- Never make up information not in the knowledge base
- Stay fair housing compliant - never use discriminatory language`;
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
