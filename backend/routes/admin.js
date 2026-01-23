const express = require('express');
const router = express.Router();
const {
  getKnowledgeBase,
  updateKnowledgeBase,
  createKnowledgeEntry,
  getAIConfig,
  updateAIConfig,
} = require('../services/supabase');

// ==================
// Knowledge Base
// ==================

// GET /api/admin/knowledge - Get all knowledge base entries
router.get('/knowledge', async (req, res, next) => {
  try {
    const knowledge = await getKnowledgeBase();
    res.json(knowledge);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/knowledge - Create knowledge base entry
router.post('/knowledge', async (req, res, next) => {
  try {
    const { category, title, content } = req.body;

    if (!category || !title || !content) {
      return res.status(400).json({ error: 'category, title, and content are required' });
    }

    const entry = await createKnowledgeEntry({ category, title, content });
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/knowledge/:id - Update knowledge base entry
router.put('/knowledge/:id', async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const entry = await updateKnowledgeBase(req.params.id, content);
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

// ==================
// AI Configuration
// ==================

// GET /api/admin/config - Get AI config
router.get('/config', async (req, res, next) => {
  try {
    const config = await getAIConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/config - Update AI config
router.put('/config', async (req, res, next) => {
  try {
    const { assistant_name, personality_rules, greeting_message } = req.body;

    const updates = {};
    if (assistant_name) updates.assistant_name = assistant_name;
    if (personality_rules) updates.personality_rules = personality_rules;
    if (greeting_message) updates.greeting_message = greeting_message;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const config = await updateAIConfig(updates);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
