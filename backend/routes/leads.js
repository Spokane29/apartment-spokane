const express = require('express');
const router = express.Router();
const { getLeads, getLeadById, updateLead, createLead } = require('../services/supabase');
const { syncLead } = require('../services/leasingvoice');

// GET /api/leads - Get all leads
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const leads = await getLeads({ status });
    res.json(leads);
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', async (req, res, next) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

// POST /api/leads - Create lead manually
router.post('/', async (req, res, next) => {
  try {
    const { first_name, last_name, phone, email, move_in_date, message } = req.body;

    if (!first_name || !phone) {
      return res.status(400).json({ error: 'First name and phone are required' });
    }

    const lead = await createLead({
      first_name,
      last_name,
      phone,
      email,
      move_in_date,
      message,
      source: 'website-chat',
      property_interest: '104 S Oak',
    });

    // Sync to LeasingVoice
    syncLead(lead).catch(console.error);

    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/leads/:id - Update lead
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const lead = await updateLead(req.params.id, { status, notes });
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
