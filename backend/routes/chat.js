const express = require('express');
const router = express.Router();
const claude = require('../services/claude');
const { createLead, updateLead, getLeadById } = require('../services/supabase');
const { syncLead } = require('../services/leasingvoice');

// Store active sessions in memory (replace with Redis for production)
const sessions = new Map();

// POST /api/chat - Handle chat messages
router.post('/', async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId || crypto.randomUUID(),
        messages: [],
        leadId: null,
        collectedInfo: {},
      };
      sessions.set(session.id, session);
    }

    // Add user message to history
    session.messages.push({
      role: 'user',
      content: message,
    });

    // Get AI response
    const response = await claude.chat(session.messages, session.id);

    // Add assistant message to history
    session.messages.push({
      role: 'assistant',
      content: response.message,
    });

    // Update collected lead info
    if (response.leadInfo) {
      session.collectedInfo = {
        ...session.collectedInfo,
        ...response.leadInfo,
      };

      // Create or update lead in database when we have minimum info
      if (session.collectedInfo.first_name && session.collectedInfo.phone) {
        try {
          if (!session.leadId) {
            // Create new lead
            const lead = await createLead({
              ...session.collectedInfo,
              chat_transcript: session.messages,
              source: 'website-chat',
              property_interest: '104 S Oak',
            });
            session.leadId = lead.id;

            // Sync to LeasingVoice
            syncLead(session.collectedInfo).catch(console.error);
          } else {
            // Update existing lead
            await updateLead(session.leadId, {
              ...session.collectedInfo,
              chat_transcript: session.messages,
            });
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Don't fail the chat response if DB fails
        }
      }
    }

    res.json({
      message: response.message,
      sessionId: session.id,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/greeting - Get initial greeting
router.get('/greeting', async (req, res, next) => {
  try {
    const greeting = await claude.getGreeting();
    const sessionId = crypto.randomUUID();

    // Initialize session
    sessions.set(sessionId, {
      id: sessionId,
      messages: [],
      leadId: null,
      collectedInfo: {},
    });

    res.json({
      message: greeting,
      sessionId,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
