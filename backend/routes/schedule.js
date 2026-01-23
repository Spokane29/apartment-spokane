const express = require('express');
const router = express.Router();
const { scheduleTour, getTours, getLeadById } = require('../services/supabase');

// GET /api/schedule - Get all scheduled tours
router.get('/', async (req, res, next) => {
  try {
    const { upcoming } = req.query;
    const tours = await getTours({ upcoming: upcoming === 'true' });
    res.json(tours);
  } catch (error) {
    next(error);
  }
});

// POST /api/schedule - Schedule a tour
router.post('/', async (req, res, next) => {
  try {
    const { lead_id, tour_date, tour_time, notes } = req.body;

    if (!lead_id || !tour_date || !tour_time) {
      return res.status(400).json({ error: 'lead_id, tour_date, and tour_time are required' });
    }

    // Verify lead exists
    const lead = await getLeadById(lead_id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const tour = await scheduleTour({
      lead_id,
      tour_date,
      tour_time,
      notes,
      confirmed: false,
    });

    res.status(201).json({
      ...tour,
      lead: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        phone: lead.phone,
        email: lead.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
